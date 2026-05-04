# 16 — Tasks and Reminders

**Files:** `prisma/schema.prisma` (models), `src/db/tasks.ts`, `src/db/reminders.ts`

Tasks and reminders form the product's lightweight task management system. Both are scoped to workspaces and can optionally link to boards and canvas items.

## The Task model

```prisma
model Task {
  id           String    @id @default(cuid())
  workspaceId  String
  boardId      String?
  canvasItemId String?
  title        String
  description  String?
  status       String    @default("open")
  priority     String    @default("normal")
  dueAt        DateTime?
  createdBy    String
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  completedAt  DateTime?

  workspace Workspace  @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  board     Board?     @relation(fields: [boardId], references: [id], onDelete: SetNull)
  reminders Reminder[]

  @@index([workspaceId])
  @@index([boardId])
  @@index([status])
  @@index([dueAt])
}
```

### Fields

| Field | Type | Purpose |
|---|---|---|
| `id` | `String (cuid)` | Primary key |
| `workspaceId` | `String` | Multi-tenant isolation |
| `boardId` | `String?` | Optional link to a board |
| `canvasItemId` | `String?` | Optional link to a canvas task_list item |
| `title` | `String` | The task title (required) |
| `description` | `String?` | Optional longer description |
| `status` | `String` | `open` or `completed` |
| `priority` | `String` | `low`, `normal`, or `high` |
| `dueAt` | `DateTime?` | Optional due date |
| `createdBy` | `String` | Actor: `user`, `assistant`, `system`, `import` |
| `completedAt` | `DateTime?` | When the task was marked complete |

### Why two links: boardId + canvasItemId

A task can exist in two contexts:

1. **Standalone task**: Created in the task center (`/tasks` page). Has `boardId` or neither link — lives independently.
2. **Canvas-embedded task**: Tied to a `task_list` canvas item on a board. Has both `boardId` and `canvasItemId` — the frontend updates both the Task record and the canvas item's content array in sync.

This dual link allows:
- The task center to show "all open tasks" across all boards.
- A board's task_list canvas item to show its own subset.
- Tasks that belong to neither — quick-capture from Telegram or the assistant.

### Status and priority

Status is a two-state enum:
- **`open`**: Default for new tasks.
- **`completed`**: Set when the user toggles the checkbox.

Priority is a three-level system:
- **`low`**: Nice to have, no urgency.
- **`normal`**: Default. Standard priority.
- **`high`**: Important or urgent.

These are stored as strings rather than Prisma enums for flexibility — the frontend can add new statuses or priorities without a schema migration.

### Indexes

```prisma
@@index([workspaceId])
@@index([boardId])
@@index([status])
@@index([dueAt])
```

- `status`: Filtering by open/completed (common UI filter).
- `dueAt`: Ordering tasks by due date — `listOpenTasksForWorkspace` orders `dueAt asc` so soonest-due tasks appear first.

## Task CRUD (`src/db/tasks.ts`)

### createTask

```typescript
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
```

Priority defaults to `"normal"` if not specified.

### listOpenTasksForWorkspace

```typescript
export function listOpenTasksForWorkspace(workspaceId: string): Promise<Task[]> {
  return prisma.task.findMany({
    orderBy: [{ dueAt: "asc" }, { updatedAt: "desc" }],
    where: {
      status: "open",
      workspaceId,
    },
  });
}
```

Two-level sort:
1. **dueAt ascending**: Tasks with the nearest due date come first.
2. **updatedAt descending**: Tasks with the same due date (or no due date) show the most recently modified first.

### Completing a task

There is no dedicated `completeTask` function in `db/tasks.ts` — the API route uses Prisma directly:

```typescript
await prisma.task.update({
  where: { id: taskId },
  data: {
    status: "completed",
    completedAt: new Date(),
  },
});
```

`completedAt` is set to the current timestamp so we know *when* a task was finished — useful for weekly reviews and productivity metrics.

### Undoing completion

Setting status back to `"open"` and `completedAt` to `null` effectively undoes completion. The task returns to the open list.

## The Reminder model

```prisma
model Reminder {
  id           String    @id @default(cuid())
  workspaceId  String
  boardId      String?
  canvasItemId String?
  taskId       String?
  title        String
  remindAt     DateTime
  status       String    @default("scheduled")
  createdBy    String
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  sentAt       DateTime?
  canceledAt   DateTime?

  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  board     Board?    @relation(fields: [boardId], references: [id], onDelete: SetNull)
  task      Task?     @relation(fields: [taskId], references: [id], onDelete: SetNull)

  @@index([workspaceId])
  @@index([boardId])
  @@index([taskId])
  @@index([remindAt])
  @@index([status])
}
```

### Fields

| Field | Type | Purpose |
|---|---|---|
| `id` | `String (cuid)` | Primary key |
| `workspaceId` | `String` | Multi-tenant isolation |
| `boardId` | `String?` | Optional link to a board |
| `canvasItemId` | `String?` | Optional link to a canvas item |
| `taskId` | `String?` | Optional link to a task (reminders can be task-specific) |
| `title` | `String` | What the reminder is about |
| `remindAt` | `DateTime` | When to trigger the reminder |
| `status` | `String` | `scheduled`, `sent`, or `canceled` |
| `sentAt` | `DateTime?` | When the reminder was actually sent |
| `canceledAt` | `DateTime?` | When the reminder was canceled |

### Status lifecycle

```
scheduled → sent     (normal path: reminder time arrived, notification sent)
scheduled → canceled (user canceled before it fired)
```

Once `sent` or `canceled`, the status doesn't change. Reminders are one-shot — no recurring reminders.

### Optional taskId link

A reminder can optionally link to a specific task. This enables:
- "Remind me about this task tomorrow at 9 AM."
- The reminder notification can include the task title and link.

If `taskId` is set and the task is completed before the reminder fires, the system should cancel the reminder (since there's nothing to remind about). This logic lives in the notification scheduler.

## Reminder CRUD (`src/db/reminders.ts`)

### createReminder

```typescript
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
```

Status defaults to `"scheduled"` (set by the database default in the schema).

### listScheduledRemindersForWorkspace

```typescript
export function listScheduledRemindersForWorkspace(
  workspaceId: string,
): Promise<Reminder[]> {
  return prisma.reminder.findMany({
    orderBy: { remindAt: "asc" },
    where: {
      status: "scheduled",
      workspaceId,
    },
  });
}
```

Used by the notification scheduler to find reminders that need to fire. Ordered by `remindAt asc` so the soonest reminder is processed first.

## Task center page (`/tasks`)

The task center provides a dedicated view for managing tasks outside the canvas:

1. **List view**: Shows all open tasks ordered by due date then recency.
2. **Create form**: Title, optional description, priority selector (low/normal/high), optional due date picker.
3. **Mark complete**: A checkbox toggle that calls `PATCH /api/tasks/[id]` to flip the status.
4. **Filter**: Toggle between open/completed/all tasks.
5. **Board link**: If a task has a `boardId`, clicking it navigates to that board.

## Assistant tools for tasks and reminders

The AI assistant has two dedicated tools (in `src/server/assistant/task-tools.ts`):

### create_task tool
- Accepts: title, description, priority, dueAt, boardId (optional).
- Calls `createTask()` with `createdBy: "assistant"`.
- User sees: "AI created a task: 'Review Q4 metrics'."

### create_reminder tool
- Accepts: title, remindAt, boardId/taskId (optional).
- Calls `createReminder()` with `createdBy: "assistant"`.
- User sees: "AI set a reminder for tomorrow at 9 AM: 'Standup prep'."

Both tools require the board to exist and belong to the user's workspace.

## Telegram integration

Via Telegram commands (see `src/server/telegram/commands.ts`):

- `/task Buy groceries #high tomorrow`: Creates a task with priority "high" and due date tomorrow.
- `/remind Standup in 30 minutes`: Creates a reminder scheduled 30 minutes from now.

These go through the same `createTask` and `createReminder` functions in `db/tasks.ts` and `db/reminders.ts` — there's no separate code path.

## API routes

### Tasks

| Method | Route | Action |
|---|---|---|
| `GET` | `/api/tasks` | List open tasks for workspace |
| `POST` | `/api/tasks` | Create a task |
| `GET` | `/api/tasks/[id]` | Get a single task |
| `PATCH` | `/api/tasks/[id]` | Update a task (title, status, dueAt, etc.) |

### Reminders

Currently managed through the assistant tools and Telegram commands. A REST API for reminders can be added when a reminder UI is built.

**Next:** [17-audit-events.md](./17-audit-events.md) — the audit event system that records every action in the application.
