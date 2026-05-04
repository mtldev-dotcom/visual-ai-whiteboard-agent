import type { CanvasItem, Prisma } from "@/generated/prisma/client";

import { getPrismaClient } from "./client";

export type CanvasItemActor = "user" | "assistant" | "system" | "import";

export type CreateCanvasItemInput = {
  workspaceId: string;
  boardId: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content: Prisma.InputJsonValue;
  style?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
  safetyMetadata?: Prisma.InputJsonValue;
  createdBy: CanvasItemActor;
};

export type UpdateCanvasItemInput = {
  itemId: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  content?: Prisma.InputJsonValue;
  style?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
  safetyMetadata?: Prisma.InputJsonValue;
};

export function createCanvasItem(
  input: CreateCanvasItemInput,
): Promise<CanvasItem> {
  const prisma = getPrismaClient();

  return prisma.canvasItem.create({
    data: {
      workspaceId: input.workspaceId,
      boardId: input.boardId,
      type: input.type,
      x: input.x,
      y: input.y,
      width: input.width,
      height: input.height,
      content: input.content,
      style: input.style ?? {},
      metadata: input.metadata ?? {},
      safetyMetadata: input.safetyMetadata ?? {},
      createdBy: input.createdBy,
    },
  });
}

export function listCanvasItemsForBoard(
  boardId: string,
): Promise<CanvasItem[]> {
  const prisma = getPrismaClient();

  return prisma.canvasItem.findMany({
    where: {
      boardId,
      deletedAt: null,
    },
    orderBy: { updatedAt: "desc" },
  });
}

export function getCanvasItemById(itemId: string): Promise<CanvasItem | null> {
  const prisma = getPrismaClient();

  return prisma.canvasItem.findFirst({
    where: {
      id: itemId,
      deletedAt: null,
    },
  });
}

export function updateCanvasItem(
  input: UpdateCanvasItemInput,
): Promise<CanvasItem> {
  const prisma = getPrismaClient();

  return prisma.canvasItem.update({
    where: { id: input.itemId },
    data: {
      x: input.x,
      y: input.y,
      width: input.width,
      height: input.height,
      content: input.content,
      style: input.style,
      metadata: input.metadata,
      safetyMetadata: input.safetyMetadata,
    },
  });
}

export function softDeleteCanvasItem(itemId: string): Promise<CanvasItem> {
  const prisma = getPrismaClient();

  return prisma.canvasItem.update({
    where: { id: itemId },
    data: { deletedAt: new Date() },
  });
}
