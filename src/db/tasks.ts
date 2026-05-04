import type { Task } from "@/generated/prisma/client";

import { getPrismaClient } from "./client";

export type CreateTaskInput = {
  workspaceId: string;
  boardId?: string;
  canvasItemId?: string;
  title: string;
  description?: string;
  priority?: "low" | "normal" | "high";
  dueAt?: Date;
  createdBy: "user" | "assistant" | "system" | "import";
};

export function createTask(input: CreateTaskInput): Promise<Task> {
  const prisma = getPrismaClient();

  return prisma.task.create({
    data: {
      boardId: input.boardId,
      canvasItemId: input.canvasItemId,
      createdBy: input.createdBy,
      description: input.description,
      dueAt: input.dueAt,
      priority: input.priority ?? "normal",
      title: input.title,
      workspaceId: input.workspaceId,
    },
  });
}

export function listOpenTasksForWorkspace(
  workspaceId: string,
): Promise<Task[]> {
  const prisma = getPrismaClient();

  return prisma.task.findMany({
    orderBy: [{ dueAt: "asc" }, { updatedAt: "desc" }],
    where: {
      status: "open",
      workspaceId,
    },
  });
}
