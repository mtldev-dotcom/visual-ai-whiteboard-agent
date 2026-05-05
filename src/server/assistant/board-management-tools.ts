import { getBoardById } from "@/db/boards";
import { readCoreFile, writeCoreFile } from "@/server/core-files";
import {
  getDeletedCanvasItemById,
  listCanvasItemsForBoard,
  restoreCanvasItem,
  updateCanvasItem,
} from "@/db/canvas-items";
import { getPrismaClient } from "@/db/client";

import type { Prisma } from "@/generated/prisma/client";
import type {
  ToolDefinition,
  ToolRegistry,
  ToolValidationResult,
} from "./tools";

// ─── Types ───────────────────────────────────────────────────────────────────

type OrganizeBoardInput = {
  boardId: string;
  strategy?: "grid" | "rows" | "columns";
};

type DuplicateBoardInput = {
  boardId: string;
  title?: string;
};

type RollbackCanvasChangeInput = {
  itemId: string;
  confirmed: boolean;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isObject(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function actorToCreatedBy(actorType: string) {
  if (actorType === "assistant" || actorType === "system") return actorType;
  return "user";
}

// ─── organize_board ───────────────────────────────────────────────────────────

export function validateOrganizeBoardInput(
  input: unknown,
): ToolValidationResult {
  if (!isObject(input)) return { ok: false, error: "Input must be an object." };
  if (typeof input.boardId !== "string" || !input.boardId.trim()) {
    return { ok: false, error: "boardId is required." };
  }
  if (
    input.strategy !== undefined &&
    !["grid", "rows", "columns"].includes(input.strategy as string)
  ) {
    return {
      ok: false,
      error: "strategy must be grid, rows, or columns.",
    };
  }
  return { ok: true };
}

const GRID_GAP = 40;
const GRID_START_X = 80;
const GRID_START_Y = 80;

function computeGridPositions(
  items: Array<{ id: string; width: number; height: number }>,
  strategy: "grid" | "rows" | "columns",
): Array<{ id: string; x: number; y: number }> {
  const n = items.length;
  if (n === 0) return [];

  const maxW = Math.max(...items.map((i) => i.width));
  const maxH = Math.max(...items.map((i) => i.height));
  const cellW = maxW + GRID_GAP;
  const cellH = maxH + GRID_GAP;

  const cols =
    strategy === "rows"
      ? n
      : strategy === "columns"
        ? 1
        : Math.min(4, Math.ceil(Math.sqrt(n)));

  return items.map((item, idx) => ({
    id: item.id,
    x: GRID_START_X + (idx % cols) * cellW,
    y: GRID_START_Y + Math.floor(idx / cols) * cellH,
  }));
}

export const organizeBoardTool: ToolDefinition<OrganizeBoardInput> = {
  name: "organize_board",
  description:
    "Rearrange all canvas items on a board into a tidy layout. strategy: grid (default, square-ish grid), rows (single row), or columns (single column). Items are grouped by type.",
  permissionLevel: 1,
  validate: validateOrganizeBoardInput,
  execute: async (input, context) => {
    const board = await getBoardById(input.boardId);
    if (!board || board.workspaceId !== context.workspaceId) {
      return { ok: false, summary: "Board not found.", error: "Board not found." };
    }

    const items = await listCanvasItemsForBoard(input.boardId);
    if (items.length === 0) {
      return {
        ok: true,
        summary: "Board has no items to organize.",
        output: { moved: 0 },
      };
    }

    const strategy = (input.strategy ?? "grid") as "grid" | "rows" | "columns";
    const sorted = [...items].sort(
      (a, b) => a.type.localeCompare(b.type) || a.id.localeCompare(b.id),
    );
    const positions = computeGridPositions(sorted, strategy);

    await Promise.all(
      positions.map((pos) =>
        updateCanvasItem({ itemId: pos.id, x: pos.x, y: pos.y }),
      ),
    );

    return {
      ok: true,
      summary: `Organized ${items.length} item${items.length === 1 ? "" : "s"} on "${board.title}" using a ${strategy} layout.`,
      output: { moved: items.length, strategy },
    };
  },
};

// ─── duplicate_board ──────────────────────────────────────────────────────────

export function validateDuplicateBoardInput(
  input: unknown,
): ToolValidationResult {
  if (!isObject(input)) return { ok: false, error: "Input must be an object." };
  if (typeof input.boardId !== "string" || !input.boardId.trim()) {
    return { ok: false, error: "boardId is required." };
  }
  if (
    input.title !== undefined &&
    (typeof input.title !== "string" || !input.title.trim())
  ) {
    return {
      ok: false,
      error: "title must be a non-empty string when provided.",
    };
  }
  return { ok: true };
}

export const duplicateBoardTool: ToolDefinition<DuplicateBoardInput> = {
  name: "duplicate_board",
  description:
    "Copy a board and all its canvas items into a new top-level board. Optionally provide a title; defaults to 'Copy of <original title>'.",
  permissionLevel: 1,
  validate: validateDuplicateBoardInput,
  execute: async (input, context) => {
    const source = await getBoardById(input.boardId);
    if (!source || source.workspaceId !== context.workspaceId) {
      return { ok: false, summary: "Board not found.", error: "Board not found." };
    }

    const items = await listCanvasItemsForBoard(input.boardId);
    const newTitle = input.title?.trim() ?? `Copy of ${source.title}`;
    const createdBy = actorToCreatedBy(context.actor.type);

    const prisma = getPrismaClient();

    const { newBoard, itemCount } = await prisma.$transaction(async (tx) => {
      const newBoard = await tx.board.create({
        data: {
          workspaceId: context.workspaceId,
          title: newTitle,
          description: source.description ?? undefined,
          createdBy,
        },
      });

      for (const item of items) {
        await tx.canvasItem.create({
          data: {
            workspaceId: context.workspaceId,
            boardId: newBoard.id,
            type: item.type,
            x: item.x,
            y: item.y,
            width: item.width,
            height: item.height,
            content: item.content as Prisma.InputJsonObject,
            style: item.style as Prisma.InputJsonObject,
            metadata: item.metadata as Prisma.InputJsonObject,
            safetyMetadata: item.safetyMetadata as Prisma.InputJsonObject,
            createdBy,
          },
        });
      }

      return { newBoard, itemCount: items.length };
    });

    return {
      ok: true,
      summary: `Duplicated "${source.title}" → "${newBoard.title}" with ${itemCount} item${itemCount === 1 ? "" : "s"}.`,
      output: { boardId: newBoard.id, title: newBoard.title, itemCount },
    };
  },
};

// ─── rollback_canvas_change ───────────────────────────────────────────────────

export function validateRollbackCanvasChangeInput(
  input: unknown,
): ToolValidationResult {
  if (!isObject(input)) return { ok: false, error: "Input must be an object." };
  if (typeof input.itemId !== "string" || !input.itemId.trim()) {
    return { ok: false, error: "itemId is required." };
  }
  if (input.confirmed !== true) {
    return {
      ok: false,
      error: "confirmed must be true to restore a deleted item.",
    };
  }
  return { ok: true };
}

export const rollbackCanvasChangeTool: ToolDefinition<RollbackCanvasChangeInput> =
  {
    name: "rollback_canvas_change",
    description:
      "Restore a canvas item that was recently deleted. Use the itemId returned by a previous delete_canvas_item call in this conversation. Set confirmed: true to proceed.",
    permissionLevel: 2,
    validate: validateRollbackCanvasChangeInput,
    execute: async (input, context) => {
      const item = await getDeletedCanvasItemById(input.itemId);
      if (!item || item.workspaceId !== context.workspaceId) {
        return {
          ok: false,
          summary: "Deleted item not found.",
          error: "Deleted item not found.",
        };
      }

      if (!item.deletedAt) {
        return {
          ok: false,
          summary: "Item is not deleted; nothing to restore.",
          error: "Item is not deleted.",
        };
      }

      await restoreCanvasItem(input.itemId);

      return {
        ok: true,
        summary: `Restored ${item.type} item to board.`,
        output: { itemId: item.id, type: item.type, boardId: item.boardId },
      };
    },
  };

// ─── update_memory ────────────────────────────────────────────────────────────

type UpdateMemoryInput = {
  boardId: string;
  note?: string;
};

function validateUpdateMemoryInput(input: unknown): ToolValidationResult {
  if (!isObject(input)) return { ok: false, error: "Input must be an object." };
  if (typeof input.boardId !== "string" || !input.boardId.trim()) {
    return { ok: false, error: "boardId is required." };
  }
  return { ok: true };
}

const updateMemoryTool: ToolDefinition<UpdateMemoryInput> = {
  name: "update_memory",
  description:
    "Summarize the current board and append the summary to MEMORY.md for long-term retention. Optionally include a custom note alongside the summary.",
  permissionLevel: 1,
  validate: validateUpdateMemoryInput,
  execute: async (input, context) => {
    const board = await getBoardById(input.boardId);
    if (!board || board.workspaceId !== context.workspaceId) {
      return { ok: false, summary: "Board not found.", error: "Board not found." };
    }

    const items = await listCanvasItemsForBoard(input.boardId);
    const typeCounts: Record<string, number> = {};
    for (const item of items) {
      typeCounts[item.type] = (typeCounts[item.type] ?? 0) + 1;
    }
    const typeBreakdown = Object.entries(typeCounts)
      .map(([t, n]) => `${n} ${t}`)
      .join(", ");

    const dateLabel = new Date().toISOString().split("T")[0];
    const lines: string[] = [
      `\n## Board memory — ${board.title} (${dateLabel})`,
      ``,
      `**Board:** ${board.title}${board.description ? ` — ${board.description}` : ""}`,
      `**Items:** ${items.length}${items.length > 0 ? ` (${typeBreakdown})` : ""}`,
    ];

    if (input.note?.trim()) {
      lines.push(`**Note:** ${input.note.trim()}`);
    }

    const existing = await readCoreFile("MEMORY.md");
    await writeCoreFile("MEMORY.md", existing.content.trimEnd() + "\n" + lines.join("\n") + "\n");

    return {
      ok: true,
      summary: `Appended memory summary for "${board.title}" to MEMORY.md.`,
      output: { boardId: board.id, title: board.title, itemCount: items.length },
    };
  },
};

// ─── Register ─────────────────────────────────────────────────────────────────

export function registerBoardManagementTools(registry: ToolRegistry) {
  registry.register(organizeBoardTool);
  registry.register(duplicateBoardTool);
  registry.register(rollbackCanvasChangeTool);
  registry.register(updateMemoryTool);
}
