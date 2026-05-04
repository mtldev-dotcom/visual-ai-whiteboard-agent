import { createTask, listOpenTasksForWorkspace } from "../../db/tasks";
import { createReminder, listScheduledRemindersForWorkspace } from "../../db/reminders";

import type {
  ToolDefinition,
  ToolRegistry,
  ToolValidationResult,
} from "./tools";

type CreateTaskInput = {
  title: string;
  description?: string;
  priority?: "low" | "normal" | "high";
  boardId?: string;
  dueAt?: string; // ISO 8601 string
};

type CreateReminderInput = {
  title: string;
  remindAt: string; // ISO 8601 string
  boardId?: string;
};

type ListTasksInput = Record<string, never>;
type ListRemindersInput = Record<string, never>;

function isObject(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function validateCreateTaskInput(input: unknown): ToolValidationResult {
  if (!isObject(input)) return { ok: false, error: "Input must be an object." };
  if (typeof input.title !== "string" || !input.title.trim()) {
    return { ok: false, error: "title is required." };
  }
  if (
    input.priority !== undefined &&
    !["low", "normal", "high"].includes(input.priority as string)
  ) {
    return { ok: false, error: "priority must be low, normal, or high." };
  }
  if (input.dueAt !== undefined && isNaN(Date.parse(input.dueAt as string))) {
    return { ok: false, error: "dueAt must be a valid ISO 8601 date string." };
  }
  return { ok: true };
}

function validateCreateReminderInput(input: unknown): ToolValidationResult {
  if (!isObject(input)) return { ok: false, error: "Input must be an object." };
  if (typeof input.title !== "string" || !input.title.trim()) {
    return { ok: false, error: "title is required." };
  }
  if (typeof input.remindAt !== "string" || isNaN(Date.parse(input.remindAt))) {
    return {
      ok: false,
      error: "remindAt must be a valid ISO 8601 date string.",
    };
  }
  return { ok: true };
}

export const createTaskTool: ToolDefinition<CreateTaskInput> = {
  name: "create_task",
  description:
    "Create a task in the workspace. Optionally attach it to a board. Use priority low/normal/high and an ISO 8601 dueAt date when provided.",
  permissionLevel: 1,
  validate: validateCreateTaskInput,
  execute: async (input, context) => {
    const task = await createTask({
      boardId: input.boardId,
      createdBy: "assistant",
      description: input.description,
      dueAt: input.dueAt ? new Date(input.dueAt) : undefined,
      priority: input.priority ?? "normal",
      title: input.title.trim(),
      workspaceId: context.workspaceId,
    });

    const due = task.dueAt
      ? ` (due ${task.dueAt.toLocaleDateString()})`
      : "";
    return {
      ok: true,
      summary: `Created task: "${task.title}"${due}`,
      output: { taskId: task.id, title: task.title, priority: task.priority },
    };
  },
};

export const listTasksTool: ToolDefinition<ListTasksInput> = {
  name: "list_tasks",
  description: "List all open tasks in the workspace.",
  permissionLevel: 1,
  validate: () => ({ ok: true }),
  execute: async (_input, context) => {
    const tasks = await listOpenTasksForWorkspace(context.workspaceId);
    const result = tasks.map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      dueAt: t.dueAt?.toISOString() ?? null,
      boardId: t.boardId,
    }));
    return {
      ok: true,
      summary: `Found ${tasks.length} open task(s).`,
      output: result,
    };
  },
};

export const createReminderTool: ToolDefinition<CreateReminderInput> = {
  name: "create_reminder",
  description:
    "Create a reminder for a specific date and time (ISO 8601). Optionally attach to a board.",
  permissionLevel: 1,
  validate: validateCreateReminderInput,
  execute: async (input, context) => {
    const reminder = await createReminder({
      boardId: input.boardId,
      createdBy: "assistant",
      remindAt: new Date(input.remindAt),
      title: input.title.trim(),
      workspaceId: context.workspaceId,
    });

    return {
      ok: true,
      summary: `Created reminder: "${reminder.title}" at ${reminder.remindAt.toLocaleString()}`,
      output: { reminderId: reminder.id, title: reminder.title, remindAt: reminder.remindAt.toISOString() },
    };
  },
};

export const listRemindersTool: ToolDefinition<ListRemindersInput> = {
  name: "list_reminders",
  description: "List all scheduled (upcoming) reminders in the workspace.",
  permissionLevel: 1,
  validate: () => ({ ok: true }),
  execute: async (_input, context) => {
    const reminders = await listScheduledRemindersForWorkspace(context.workspaceId);
    const result = reminders.map((r) => ({
      id: r.id,
      title: r.title,
      remindAt: r.remindAt.toISOString(),
      boardId: r.boardId,
    }));
    return {
      ok: true,
      summary: `Found ${reminders.length} scheduled reminder(s).`,
      output: result,
    };
  },
};

export function registerTaskTools(registry: ToolRegistry) {
  registry.register(createTaskTool);
  registry.register(listTasksTool);
  registry.register(createReminderTool);
  registry.register(listRemindersTool);
}
