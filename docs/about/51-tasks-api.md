# 51 — Tasks API (`/api/tasks`)

The tasks API manages workspace tasks — user-created and assistant-created to-do items that can optionally be linked to a specific board.

## Files referenced

- `src/app/api/tasks/route.ts` — GET (list open), POST (create)
- `src/app/api/tasks/[id]/route.ts` — PATCH (update, mark complete)
- `src/db/tasks.ts` — database functions for task operations

## GET /api/tasks — List open tasks

Lists all open (non-completed) tasks for the workspace. No query params or filters are supported — the endpoint returns the full list of open tasks.

### Flow

1. `requireSession()`
2. `listOpenTasksForWorkspace(session.workspaceId)` — fetches tasks where status is not "completed"
3. Return `{ tasks }`

### Implementation

```typescript
// src/app/api/tasks/route.ts
import { NextResponse } from "next/server";
import { createTask, listOpenTasksForWorkspace } from "@/db/tasks";
import { requireSession } from "@/lib/session";

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  const tasks = await listOpenTasksForWorkspace(session.workspaceId);
  return NextResponse.json({ tasks });
}
```

### Response shape

```json
{
  "tasks": [
    {
      "id": "...",
      "title": "Design landing page",
      "description": "Create wireframes for the new landing page",
      "status": "open",
      "priority": "high",
      "boardId": "...",
      "dueAt": "2026-05-15T00:00:00.000Z",
      "createdAt": "2026-05-04T10:00:00.000Z",
      "completedAt": null
    }
  ]
}
```

**Why only open tasks.** The endpoint name `listOpenTasksForWorkspace` is intentional. The tasks list in the UI is for active work. Completed tasks are archived and not shown in the main view. If needed, a future endpoint could add a `?status=` filter for browsing completed tasks.

## POST /api/tasks — Create a task

Creates a new task with optional description, priority, due date, and board association.

### Flow

1. `requireSession()`
2. Parse body: `{ title?, description?, priority?, dueAt?, boardId? }`
3. Validate `title` is non-empty (400 if missing)
4. `createTask()` — creates task scoped to workspace
5. Return `{ task }` with status 201

### Implementation

```typescript
export async function POST(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = (await request.json()) as {
    title?: string;
    description?: string;
    priority?: "low" | "normal" | "high";
    dueAt?: string;
    boardId?: string;
  };

  if (!body.title?.trim()) {
    return NextResponse.json(
      { error: "title is required." },
      { status: 400 }
    );
  }

  const task = await createTask({
    boardId: body.boardId,
    createdBy: "user",
    description: body.description,
    dueAt: body.dueAt ? new Date(body.dueAt) : undefined,
    priority: body.priority,
    title: body.title.trim(),
    workspaceId: session.workspaceId,
  });

  return NextResponse.json({ task }, { status: 201 });
}
```

### Priority levels

Tasks support three priority levels, defined as a TypeScript union:

```typescript
priority?: "low" | "normal" | "high"
```

The priority is optional — if not provided, the database uses its default (typically `"normal"`).

### Due dates

`dueAt` is accepted as an ISO 8601 string and converted to a `Date` object:

```typescript
dueAt: body.dueAt ? new Date(body.dueAt) : undefined,
```

If `dueAt` is not provided, it remains `undefined` (no due date). The conversion uses `new Date(body.dueAt)`, which handles ISO strings natively.

### Board association

Tasks can optionally be associated with a board via `boardId`. This allows tasks to be filtered by board in the UI. When a task is created from the assistant (`create_task` tool), the `boardId` is auto-injected from the active board context via `normalizeToolInput()` in the chat handler.

```typescript
// From src/app/api/chat/route.ts:231-237
if (
  context.boardId &&
  (toolName === "create_task" || toolName === "create_reminder") &&
  normalized.boardId === undefined
) {
  normalized.boardId = context.boardId;
}
```

## PATCH /api/tasks/[id] — Update a task

Partially updates task fields, including marking a task as complete.

### Flow

1. `requireSession()`
2. Resolve `{ id }` from `await params`
3. Fetch task with workspace scoping: `prisma.task.findFirst({ where: { id, workspaceId } })`
4. If not found → 404 `{ error: "Task not found." }`
5. Parse body: `{ status?, title?, priority?, dueAt? }`
6. Update via `prisma.task.update()`
7. If `status === "completed"` → set `completedAt: new Date()`
8. Return `{ task: updated }`

### Implementation

```typescript
// src/app/api/tasks/[id]/route.ts
import { NextResponse } from "next/server";
import { getPrismaClient } from "@/db/client";
import { requireSession } from "@/lib/session";

export async function PATCH(request: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const prisma = getPrismaClient();

  const task = await prisma.task.findFirst({
    where: { id, workspaceId: session.workspaceId },
  });

  if (!task) {
    return NextResponse.json(
      { error: "Task not found." },
      { status: 404 }
    );
  }

  const body = (await request.json()) as {
    status?: string;
    title?: string;
    priority?: string;
    dueAt?: string | null;
  };

  const updated = await prisma.task.update({
    where: { id },
    data: {
      status: body.status,
      title: body.title,
      priority: body.priority,
      dueAt:
        body.dueAt === null
          ? null
          : body.dueAt
            ? new Date(body.dueAt)
            : undefined,
      completedAt:
        body.status === "completed" ? new Date() : undefined,
    },
  });

  return NextResponse.json({ task: updated });
}
```

### Marking a task complete

The critical pattern is the automatic `completedAt` timestamp:

```typescript
completedAt: body.status === "completed" ? new Date() : undefined,
```

When the client sets `status: "completed"`, the handler automatically records the current timestamp as `completedAt`. This is a convenience that ensures consistency — the client never needs to send `completedAt` manually.

**Why auto-set completedAt.** It prevents inconsistencies where `status` is `"completed"` but `completedAt` is null, or worse, where completedAt is a client-provided timestamp that could be wrong. The server knows the exact time of completion.

### Clearing the due date

The `dueAt` field supports explicit null-to-clear:

```typescript
dueAt:
  body.dueAt === null
    ? null           // Explicitly clear the due date
    : body.dueAt
      ? new Date(body.dueAt)  // Set a new due date
      : undefined,            // Leave unchanged
```

This tri-state handling is necessary because JavaScript distinguishes between:
- `null` — client wants to remove the due date
- A string — client wants to set a new due date
- `undefined` (field not sent) — client does not want to change the due date

### Workspace ownership check pattern

Unlike the boards and canvas-items endpoints (which fetch first, then check `workspaceId`), the tasks endpoint uses a combined query:

```typescript
const task = await prisma.task.findFirst({
  where: { id, workspaceId: session.workspaceId },
});
```

This is equivalent to the two-step pattern but more efficient — a single database query validates both existence and ownership.

**Why the difference.** The boards pattern (`getBoardById(id)` + `board.workspaceId !== session.workspaceId`) works when the database function is abstracted. The tasks PATCH uses Prisma directly, so a combined `where` clause is cleaner.

## Error states

| Scenario | Status | Response |
|----------|--------|----------|
| Not authenticated | 401 | `{ error: "Unauthorized." }` |
| Missing title on create | 400 | `{ error: "title is required." }` |
| Task not found or wrong workspace | 404 | `{ error: "Task not found." }` |

## Why tasks use Prisma directly instead of db/tasks.ts

The PATCH handler calls `getPrismaClient()` directly rather than using a `@/db/tasks` function. This is because task updates are simple enough that an abstracted function provides little value. The pattern of mixing `@/db/*` abstractions and direct Prisma calls is project-specific — the rule of thumb is:

- **Use `@/db/*`** when the operation involves multiple queries, business logic, or is used by multiple handlers (creates, lists, soft-deletes).
- **Use Prisma directly** when the operation is a single, straightforward query.

The `createTask` and `listOpenTasksForWorkspace` functions are in `@/db/tasks.ts` because they are reused. The update is only in one place, so it calls Prisma directly.

## Task lifecycle

```
POST /api/tasks              → Creates task (status: "open", 201)
                                  │
GET /api/tasks               → Lists open tasks (200)
                                  │
PATCH /api/tasks/[id]        → Updates fields (200)
  - title, priority, dueAt       → Modifies metadata
  - status: "completed"          → Sets completedAt, hides from list
```

Tasks are never hard-deleted in the current implementation. Once completed, they disappear from `GET /api/tasks` (which only returns open tasks) but remain in the database for audit purposes.
