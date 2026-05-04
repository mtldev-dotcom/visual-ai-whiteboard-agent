import {
  createCanvasItem,
  softDeleteCanvasItem,
  updateCanvasItem,
} from "../../db/canvas-items";

import type { Prisma } from "@/generated/prisma/client";
import type {
  ToolDefinition,
  ToolRegistry,
  ToolValidationResult,
} from "./tools";

type AddCanvasItemInput = {
  boardId: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content: Record<string, unknown>;
  style?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  safetyMetadata?: Record<string, unknown>;
};

type UpdateCanvasItemInput = {
  itemId: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  content?: Record<string, unknown>;
  style?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  safetyMetadata?: Record<string, unknown>;
};

type DeleteCanvasItemInput = {
  itemId: string;
  confirmed?: boolean;
};

function isObject(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function hasNumber(input: Record<string, unknown>, key: string) {
  return typeof input[key] === "number" && Number.isFinite(input[key]);
}

function actorToCreatedBy(actorType: string) {
  if (actorType === "assistant" || actorType === "system") {
    return actorType;
  }

  return "user";
}

export function validateAddCanvasItemInput(
  input: unknown,
): ToolValidationResult {
  if (!isObject(input)) {
    return { error: "Input must be an object.", ok: false };
  }

  if (typeof input.boardId !== "string" || input.boardId.trim().length === 0) {
    return { error: "boardId is required.", ok: false };
  }

  if (typeof input.type !== "string" || input.type.trim().length === 0) {
    return { error: "type is required.", ok: false };
  }

  for (const key of ["x", "y", "width", "height"]) {
    if (!hasNumber(input, key)) {
      return { error: `${key} must be a finite number.`, ok: false };
    }
  }

  if ((input.width as number) <= 0 || (input.height as number) <= 0) {
    return { error: "width and height must be greater than zero.", ok: false };
  }

  if (!isObject(input.content)) {
    return { error: "content must be an object.", ok: false };
  }

  for (const key of ["style", "metadata", "safetyMetadata"]) {
    if (input[key] !== undefined && !isObject(input[key])) {
      return { error: `${key} must be an object when provided.`, ok: false };
    }
  }

  return { ok: true };
}

export function validateUpdateCanvasItemInput(
  input: unknown,
): ToolValidationResult {
  if (!isObject(input)) {
    return { error: "Input must be an object.", ok: false };
  }

  if (typeof input.itemId !== "string" || input.itemId.trim().length === 0) {
    return { error: "itemId is required.", ok: false };
  }

  for (const key of ["x", "y", "width", "height"]) {
    if (input[key] !== undefined && !hasNumber(input, key)) {
      return {
        error: `${key} must be a finite number when provided.`,
        ok: false,
      };
    }
  }

  if (
    (input.width !== undefined && (input.width as number) <= 0) ||
    (input.height !== undefined && (input.height as number) <= 0)
  ) {
    return { error: "width and height must be greater than zero.", ok: false };
  }

  for (const key of ["content", "style", "metadata", "safetyMetadata"]) {
    if (input[key] !== undefined && !isObject(input[key])) {
      return { error: `${key} must be an object when provided.`, ok: false };
    }
  }

  return { ok: true };
}

export function validateDeleteCanvasItemInput(
  input: unknown,
): ToolValidationResult {
  if (!isObject(input)) {
    return { error: "Input must be an object.", ok: false };
  }

  if (typeof input.itemId !== "string" || input.itemId.trim().length === 0) {
    return { error: "itemId is required.", ok: false };
  }

  if (input.confirmed !== true) {
    return {
      error: "confirmed must be true before deleting an item.",
      ok: false,
    };
  }

  return { ok: true };
}

export const addCanvasItemTool: ToolDefinition<AddCanvasItemInput> = {
  description: "Add a structured item to a board canvas.",
  execute: async (input, context) => {
    const item = await createCanvasItem({
      boardId: input.boardId,
      content: input.content as Prisma.InputJsonObject,
      createdBy: actorToCreatedBy(context.actor.type),
      height: input.height,
      metadata: input.metadata as Prisma.InputJsonObject | undefined,
      safetyMetadata: input.safetyMetadata as
        | Prisma.InputJsonObject
        | undefined,
      style: input.style as Prisma.InputJsonObject | undefined,
      type: input.type.trim(),
      width: input.width,
      workspaceId: context.workspaceId,
      x: input.x,
      y: input.y,
    });

    return {
      ok: true,
      output: { itemId: item.id, type: item.type },
      summary: `Added ${item.type} item to board.`,
    };
  },
  name: "add_canvas_item",
  permissionLevel: 1,
  validate: validateAddCanvasItemInput,
};

export const updateCanvasItemTool: ToolDefinition<UpdateCanvasItemInput> = {
  description: "Update a structured canvas item.",
  execute: async (input) => {
    const item = await updateCanvasItem({
      content: input.content as Prisma.InputJsonObject | undefined,
      height: input.height,
      itemId: input.itemId,
      metadata: input.metadata as Prisma.InputJsonObject | undefined,
      safetyMetadata: input.safetyMetadata as
        | Prisma.InputJsonObject
        | undefined,
      style: input.style as Prisma.InputJsonObject | undefined,
      width: input.width,
      x: input.x,
      y: input.y,
    });

    return {
      ok: true,
      output: { itemId: item.id, type: item.type },
      summary: `Updated ${item.type} item.`,
    };
  },
  name: "update_canvas_item",
  permissionLevel: 1,
  validate: validateUpdateCanvasItemInput,
};

export const deleteCanvasItemTool: ToolDefinition<DeleteCanvasItemInput> = {
  description: "Soft delete a canvas item after confirmation.",
  execute: async (input) => {
    const item = await softDeleteCanvasItem(input.itemId);

    return {
      ok: true,
      output: { itemId: item.id },
      summary: `Deleted ${item.type} item.`,
    };
  },
  name: "delete_canvas_item",
  permissionLevel: 2,
  validate: validateDeleteCanvasItemInput,
};

export function registerCanvasTools(registry: ToolRegistry) {
  registry.register(addCanvasItemTool);
  registry.register(updateCanvasItemTool);
  registry.register(deleteCanvasItemTool);
}
