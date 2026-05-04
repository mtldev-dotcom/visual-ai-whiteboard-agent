import { listCanvasItemsForBoard } from "../../db/canvas-items";
import { getBoardById as getBoard } from "../../db/boards";

import type {
  ToolDefinition,
  ToolRegistry,
  ToolValidationResult,
} from "./tools";

type SummarizeBoardInput = { boardId: string };
type ListCanvasItemsInput = { boardId: string };

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

export const summarizeBoardTool: ToolDefinition<SummarizeBoardInput> = {
  name: "summarize_board",
  description:
    "Fetch all canvas items on a board and return structured data so you can write a natural-language summary of what is on it.",
  permissionLevel: 1,
  validate: validateBoardIdInput,
  execute: async (input) => {
    const [board, items] = await Promise.all([
      getBoard(input.boardId),
      listCanvasItemsForBoard(input.boardId),
    ]);

    if (!board) {
      return { ok: false, summary: "Board not found.", error: "Board not found." };
    }

    const byType: Record<string, { title?: string }[]> = {};
    for (const item of items) {
      const content = item.content as Record<string, unknown>;
      if (!byType[item.type]) byType[item.type] = [];
      byType[item.type].push({ title: content.title as string | undefined });
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
  execute: async (input) => {
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
