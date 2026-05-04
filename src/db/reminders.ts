import type { Reminder } from "@/generated/prisma/client";

import { getPrismaClient } from "./client";

export type CreateReminderInput = {
  workspaceId: string;
  boardId?: string;
  canvasItemId?: string;
  taskId?: string;
  title: string;
  remindAt: Date;
  createdBy: "user" | "assistant" | "system" | "import";
};

export function createReminder(input: CreateReminderInput): Promise<Reminder> {
  const prisma = getPrismaClient();

  return prisma.reminder.create({
    data: {
      boardId: input.boardId,
      canvasItemId: input.canvasItemId,
      createdBy: input.createdBy,
      remindAt: input.remindAt,
      taskId: input.taskId,
      title: input.title,
      workspaceId: input.workspaceId,
    },
  });
}

export function listScheduledRemindersForWorkspace(
  workspaceId: string,
): Promise<Reminder[]> {
  const prisma = getPrismaClient();

  return prisma.reminder.findMany({
    orderBy: { remindAt: "asc" },
    where: {
      status: "scheduled",
      workspaceId,
    },
  });
}
