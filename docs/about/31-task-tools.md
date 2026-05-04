# Task & Reminder Tools

`src/server/assistant/task-tools.ts` implements four tools for task and reminder management. These tools work with the `Task` and `Reminder` database models, providing assistive creation and listing.

## `create_task` — Create a Task in the Workspace

Creates a task that appears in the `/tasks` task center and can be attached to a board.

**Input:**

| Field | Type | Required | Description |
|---|---|---|---|
| `title` | string | Yes | Task name |
| `description` | string | No | Optional details |
| `priority` | enum | No | One of `"low"`, `"normal"`, `"high"` (default: `"normal"`) |
| `boardId` | string | No | Board to attach the task to |
| `dueAt` | string | No | ISO 8601 date string |

**Validation (`validateCreateTaskInput`):**

```
isObject? → title is non-empty string? → priority is valid enum? → dueAt is valid ISO 8601?
```

The ISO 8601 validation uses JavaScript's `Date.parse`:

```typescript
if (input.dueAt !== undefined && isNaN(Date.parse(input.dueAt as string))) {
  return { ok: false, error: "dueAt must be a valid ISO 8601 date string." };
}
```

**Execution:**

```typescript
const task = await createTask({
  boardId: input.boardId,
  createdBy: "assistant",
  description: input.description,
  dueAt: input.dueAt ? new Date(input.dueAt) : undefined,
  priority: input.priority ?? "normal",
  title: input.title.trim(),
  workspaceId: context.workspaceId,
});
```

Tasks are always created with `createdBy: "assistant"` when called through the chat tool — this distinguishes AI-created tasks from user-created ones.

The response includes human-readable due date formatting:

```typescript
const due = task.dueAt
  ? ` (due ${task.dueAt.toLocaleDateString()})`
  : "";
return {
  ok: true,
  summary: `Created task: "${task.title}"${due}`,
  output: { taskId: task.id, title: task.title, priority: task.priority },
};
```

## `list_tasks` — List All Open Tasks

Returns all tasks with `status: "open"` in the current workspace.

**Input:** None (empty object)

**Validation:** Always passes — `{ ok: true }`

**Execution:**

```typescript
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
```

## `create_reminder` — Schedule a Reminder

Creates a time-based reminder in the workspace, optionally attached to a board.

**Input:**

| Field | Type | Required | Description |
|---|---|---|---|
| `title` | string | Yes | Reminder text |
| `remindAt` | string | Yes | ISO 8601 datetime of when to remind |
| `boardId` | string | No | Board to attach to |

**Validation (`validateCreateReminderInput`):**

```
isObject? → title is non-empty? → remindAt is valid ISO 8601?
```

The `remindAt` field is strictly validated — it must parse as a valid date:

```typescript
if (typeof input.remindAt !== "string" || isNaN(Date.parse(input.remindAt))) {
  return { ok: false, error: "remindAt must be a valid ISO 8601 date string." };
}
```

**Execution:**

```typescript
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
```

## `list_reminders` — List All Scheduled Reminders

Returns all reminders with `status: "scheduled"` in the current workspace.

**Input:** None (empty object)

**Execution:** Similar pattern to list_tasks — calls `listScheduledRemindersForWorkspace`, maps to id/title/remindAt/boardId shape.

## Timezone Handling

The chat route's runtime context provides timezone guidance to the LLM:

```
"Assume the user's local timezone is America/Toronto unless they say otherwise."
"For relative reminder phrases like 'tomorrow', 'tmr', or 'next Friday',
 convert them to an ISO 8601 remindAt before calling create_reminder."
```

This means when a user says "Remind me tomorrow at 9am", the LLM's responsibility is to:
1. Interpret "tomorrow" relative to the current date (from runtime context)
2. Convert to an ISO 8601 timestamp
3. Pass the resolved timestamp to `create_reminder`

The tool itself does no relative time parsing — it expects exact ISO 8601 strings.

## BoardId Auto-Attachment

The chat route's `normalizeToolInput` function injects the current board ID into task and reminder tools when the board context is available:

```typescript
if (
  context.boardId &&
  (toolName === "create_task" || toolName === "create_reminder") &&
  normalized.boardId === undefined
) {
  normalized.boardId = context.boardId;
}
```

This means tasks and reminders created in chat are automatically associated with the currently selected board, unless the LLM explicitly provides a different `boardId`.

## Registration & Permissions

```typescript
export function registerTaskTools(registry: ToolRegistry) {
  registry.register(createTaskTool);
  registry.register(listTasksTool);
  registry.register(createReminderTool);
  registry.register(listRemindersTool);
}
```

All four tools are permission level 1 — creating tasks/reminders is considered a safe visual/environment change. Deletion of tasks/reminders requires explicit action through the task center UI.

## Comparison: Assistant vs DB Helper

| Aspect | Assistant Tool | DB Helper |
|---|---|---|
| creator | `"assistant"` | parameterized (`"user"`) |
| validation | strict input checking | none (typed input expected) |
| ownership | verifies via context.workspaceId | relies on caller |
| error messages | user-friendly | technical |

**Key files:** `src/server/assistant/task-tools.ts`, `src/db/tasks.ts`, `src/db/reminders.ts`
