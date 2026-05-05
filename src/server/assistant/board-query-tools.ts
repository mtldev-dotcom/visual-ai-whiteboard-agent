import { listCanvasItemsForBoard } from "../../db/canvas-items";
import { getBoardById as getBoard } from "../../db/boards";

import type {
  ToolDefinition,
  ToolRegistry,
  ToolValidationResult,
} from "./tools";

type SummarizeBoardInput = { boardId: string };
type ListCanvasItemsInput = { boardId: string };

const CONTENT_PREVIEW_LIMIT = 500;

function isObject(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function validateBoardIdInput(input: unknown): ToolValidationResult {
  if (!isObject(input)) return { ok: false, error: "Input must be an object." };
  if (typeof input.boardId !== "string" || !input.boardId.trim()) {
    return { ok: false, error: "boardId is required." };
  }
  return { ok: true };
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function truncate(value: string, limit = CONTENT_PREVIEW_LIMIT): string {
  return value.length > limit ? `${value.slice(0, limit - 1)}...` : value;
}

export function summarizeCanvasItemContent(content: Record<string, unknown>) {
  const title = asString(content.title);
  const text = asString(content.text);
  const href = asString(content.href);
  const targetBoardId = asString(content.targetBoardId);
  const alt = asString(content.alt);
  const tasks = Array.isArray(content.tasks)
    ? content.tasks.filter(isObject).map((task) => ({
        completed: Boolean(task.completed),
        title: asString(task.title) ?? "Untitled task",
      }))
    : undefined;
  const columns = Array.isArray(content.columns)
    ? content.columns.filter(isObject).map((column) => ({
        cards: Array.isArray(column.cards)
          ? column.cards.filter(isObject).map((card) => ({
              title: asString(card.title) ?? "Untitled card",
            }))
          : [],
        title: asString(column.title) ?? "Untitled column",
      }))
    : undefined;

  const previewParts = [
    title ? `Title: ${title}` : null,
    text ? `Text: ${text}` : null,
    href ? `URL: ${href}` : null,
    targetBoardId ? `Target board: ${targetBoardId}` : null,
    alt ? `Alt: ${alt}` : null,
    tasks?.length
      ? `Tasks: ${tasks
          .map((task) => `${task.completed ? "[x]" : "[ ]"} ${task.title}`)
          .join("; ")}`
      : null,
    columns?.length
      ? `Columns: ${columns
          .map(
            (column) =>
              `${column.title} (${column.cards.length} card${
                column.cards.length === 1 ? "" : "s"
              }${column.cards.length ? `: ${column.cards.map((card) => card.title).join(", ")}` : ""})`,
          )
          .join("; ")}`
      : null,
  ].filter(Boolean);

  return {
    alt,
    columns,
    href,
    preview: truncate(previewParts.join(" | ") || "No readable content."),
    tasks,
    text,
    title,
    targetBoardId,
  };
}

export const summarizeBoardTool: ToolDefinition<SummarizeBoardInput> = {
  name: "summarize_board",
  description:
    "Fetch all canvas items on a board and return structured data so you can write a natural-language summary of what is on it.",
  permissionLevel: 1,
  validate: validateBoardIdInput,
  execute: async (input, context) => {
    const [board, items] = await Promise.all([
      getBoard(input.boardId),
      listCanvasItemsForBoard(input.boardId),
    ]);

    if (!board || board.workspaceId !== context.workspaceId) {
      return {
        ok: false,
        summary: "Board not found.",
        error: "Board not found.",
      };
    }

    const itemSummaries = items.map((item) => {
      const content = isObject(item.content) ? item.content : {};
      const contentSummary = summarizeCanvasItemContent(content);

      return {
        id: item.id,
        type: item.type,
        title: contentSummary.title ?? null,
        content: contentSummary,
        position: {
          x: Math.round(item.x),
          y: Math.round(item.y),
          width: Math.round(item.width),
          height: Math.round(item.height),
        },
      };
    });

    const byType: Record<string, { title?: string | null }[]> = {};
    for (const item of itemSummaries) {
      if (!byType[item.type]) byType[item.type] = [];
      byType[item.type].push({ title: item.title });
    }

    const breakdown = Object.entries(byType).map(([type, list]) => ({
      type,
      count: list.length,
      titles: list.map((i) => i.title).filter(Boolean),
    }));

    return {
      ok: true,
      summary: `Retrieved ${items.length} items from board "${board.title}".`,
      output: {
        boardId: board.id,
        boardTitle: board.title,
        boardDescription: board.description,
        totalItems: items.length,
        breakdown,
        items: itemSummaries,
      },
    };
  },
};

export const listCanvasItemsTool: ToolDefinition<ListCanvasItemsInput> = {
  name: "list_canvas_items",
  description:
    "List all canvas items on a board with their IDs, types, positions, and content. Use this when you need item IDs to update or delete specific items.",
  permissionLevel: 1,
  validate: validateBoardIdInput,
  execute: async (input, context) => {
    const board = await getBoard(input.boardId);

    if (!board || board.workspaceId !== context.workspaceId) {
      return {
        ok: false,
        summary: "Board not found.",
        error: "Board not found.",
      };
    }

    const items = await listCanvasItemsForBoard(input.boardId);

    const result = items.map((item) => ({
      id: item.id,
      type: item.type,
      x: Math.round(item.x),
      y: Math.round(item.y),
      width: Math.round(item.width),
      height: Math.round(item.height),
      content: item.content,
    }));

    return {
      ok: true,
      summary: `Found ${items.length} items on board.`,
      output: result,
    };
  },
};

export function registerBoardQueryTools(registry: ToolRegistry) {
  registry.register(summarizeBoardTool);
  registry.register(listCanvasItemsTool);
}
