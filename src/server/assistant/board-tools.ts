import { createBoard, createSubBoard, getBoardById } from "../../db/boards";

import type {
  ToolDefinition,
  ToolRegistry,
  ToolValidationResult,
} from "./tools";

type CreateBoardInput = {
  title: string;
  description?: string;
};

type CreateSubBoardInput = CreateBoardInput & {
  parentBoardId: string;
};

function isObject(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

export function validateCreateBoardInput(input: unknown): ToolValidationResult {
  if (!isObject(input)) {
    return { error: "Input must be an object.", ok: false };
  }

  if (typeof input.title !== "string" || input.title.trim().length === 0) {
    return { error: "title is required.", ok: false };
  }

  if (
    input.description !== undefined &&
    typeof input.description !== "string"
  ) {
    return { error: "description must be a string when provided.", ok: false };
  }

  return { ok: true };
}

export function validateCreateSubBoardInput(
  input: unknown,
): ToolValidationResult {
  const baseValidation = validateCreateBoardInput(input);

  if (!baseValidation.ok) {
    return baseValidation;
  }

  if (!isObject(input)) {
    return { error: "Input must be an object.", ok: false };
  }

  if (
    typeof input.parentBoardId !== "string" ||
    input.parentBoardId.trim().length === 0
  ) {
    return { error: "parentBoardId is required.", ok: false };
  }

  return { ok: true };
}

function actorToCreatedBy(actorType: string) {
  if (actorType === "assistant" || actorType === "system") {
    return actorType;
  }

  return "user";
}

export const createBoardTool: ToolDefinition<CreateBoardInput> = {
  description: "Create a board in the current workspace.",
  execute: async (input, context) => {
    const board = await createBoard({
      createdBy: actorToCreatedBy(context.actor.type),
      description: input.description,
      title: input.title.trim(),
      workspaceId: context.workspaceId,
    });

    return {
      ok: true,
      output: { boardId: board.id, title: board.title },
      summary: `Created board: ${board.title}`,
    };
  },
  name: "create_board",
  permissionLevel: 1,
  validate: validateCreateBoardInput,
};

export const createSubBoardTool: ToolDefinition<CreateSubBoardInput> = {
  description: "Create a sub-board under an existing board.",
  execute: async (input, context) => {
    const parentBoard = await getBoardById(input.parentBoardId);

    if (!parentBoard || parentBoard.workspaceId !== context.workspaceId) {
      return {
        error: "Parent board not found.",
        ok: false,
        summary: "Parent board not found.",
      };
    }

    const board = await createSubBoard({
      createdBy: actorToCreatedBy(context.actor.type),
      description: input.description,
      parentBoardId: input.parentBoardId,
      title: input.title.trim(),
      workspaceId: context.workspaceId,
    });

    return {
      ok: true,
      output: {
        boardId: board.id,
        parentBoardId: board.parentBoardId,
        title: board.title,
      },
      summary: `Created sub-board: ${board.title}`,
    };
  },
  name: "create_sub_board",
  permissionLevel: 1,
  validate: validateCreateSubBoardInput,
};

export function registerBoardTools(registry: ToolRegistry) {
  registry.register(createBoardTool);
  registry.register(createSubBoardTool);
}
