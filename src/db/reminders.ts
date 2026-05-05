import type { Reminder } from "@/generated/prisma/client";

import { getPrismaClient } from "./client";

export type CreateReminderInput = {
  workspaceId: string;
  boardId?: string;
  canvasItemId?: string;
  taskId?: string;
  title: string;
  remindAt: Date;
  recurrence?: "daily" | "weekly" | "monthly" | "yearly" | null;
  recurrenceEnd?: Date | null;
  createdBy: "user" | "assistant" | "system" | "import";
};

export function createReminder(input: CreateReminderInput): Promise<Reminder> {
  const prisma = getPrismaClient();

  return prisma.reminder.create({
    data: {
      boardId: input.boardId,
      canvasItemId: input.canvasItemId,
      createdBy: input.createdBy,
      recurrence: input.recurrence ?? null,
      recurrenceEnd: input.recurrenceEnd ?? null,
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

export function getDueReminders(workspaceId: string): Promise<Reminder[]> {
  const prisma = getPrismaClient();

  return prisma.reminder.findMany({
    orderBy: { remindAt: "asc" },
    where: {
      remindAt: { lte: new Date() },
      status: "scheduled",
      workspaceId,
    },
  });
}

export function markReminderSent(reminderId: string): Promise<Reminder> {
  const prisma = getPrismaClient();

  return prisma.reminder.update({
    data: { sentAt: new Date(), status: "sent" },
    where: { id: reminderId },
  });
}

export function nextRemindAt(
  base: Date,
  recurrence: string,
): Date {
  const next = new Date(base);
  switch (recurrence) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      break;
    case "yearly":
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  return next;
}
