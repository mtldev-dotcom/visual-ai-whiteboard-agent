# 07 — Database Helpers

Every `src/db/` module provides typed, focused helper functions for a specific domain. They are thin wrappers around PrismaClient methods — they add input typing, default values, and domain-specific filtering but never bypass the generated client.

The common pattern across all helpers:

```typescript
import { getPrismaClient } from "./client";

export function someOperation(input: TypedInput): Promise<ReturnModel> {
  const prisma = getPrismaClient();
  return prisma.someModel.someMethod({
    // typed parameters with sensible defaults
  });
}
```

## `boards.ts` (119 lines)

File: `src/db/boards.ts`

### Type Exports

| Type | Fields | Purpose |
|---|---|---|
| `CreateBoardInput` | `workspaceId`, `title`, `description?`, `createdBy` | Creating a new top-level board |
| `CreateSubBoardInput` | extends `CreateBoardInput` + `parentBoardId` | Creating a board nested under another |
| `UpdateBoardInput` | `boardId`, `title?`, `description?` (can be `null` to clear) | Partial update |

The `createdBy` field uses a union type: `"user" | "assistant" | "system" | "import"`. This ensures callers are explicit about who created the board.

### Functions

**`createBoard(input: CreateBoardInput): Promise<Board>`**

A straightforward `prisma.board.create()` with no special logic. The CUID ID is auto-generated.

**`createSubBoard(input: CreateSubBoardInput): Promise<Board>`**

Same as `createBoard` but includes `parentBoardId`. Uses the same `prisma.board.create()` — Prisma handles the self-referential foreign key.

**`listBoardsForWorkspace(workspaceId: string): Promise<Board[]>`**

Returns all non-archived boards for a workspace, ordered by `updatedAt: desc` (most recently modified first). The key filter:

```typescript
where: {
  workspaceId,
  archivedAt: null,
}
```

This ensures archived boards are hidden from the sidebar and board explorer.

**`getBoardById(boardId: string): Promise<Board | null>`**

Uses `findFirst` with both `id` and `archivedAt: null` filter. `findFirst` is used instead of `findUnique` because `findUnique` only works with `@unique` or `@id` fields — it cannot apply additional where conditions.

**`updateBoard(input: UpdateBoardInput): Promise<Board>`**

Partial update — only `title` and `description` can change. Setting `description: null` clears it. Other fields (workspaceId, createdBy, archivedAt) cannot be changed through this function.

**`archiveBoard(boardId: string): Promise<Board>`**

Sets `archivedAt = new Date()`. The board is hidden from listings but retained in the database. There is no un-archive function (yet).

**`searchBoardsForWorkspace(workspaceId: string, query: string): Promise<Board[]>`**

Case-insensitive search by title:

```typescript
where: {
  workspaceId,
  archivedAt: null,
  title: { contains: query, mode: "insensitive" },
},
take: 30,
```

The `take: 30` limit prevents unbounded results. The `mode: "insensitive"` uses PostgreSQL's `ILIKE` operator behind the scenes.

**`listSubBoards(parentBoardId: string): Promise<Board[]>`**

Returns non-archived boards where `parentBoardId` matches, ordered by `updatedAt: desc`.

## `canvas-items.ts` (109 lines)

File: `src/db/canvas-items.ts`

### Type Exports

| Type | Purpose |
|---|---|
| `CanvasItemActor` | `"user" | "assistant" | "system" | "import"` — who created the item |
| `CreateCanvasItemInput` | All required fields: workspaceId, boardId, type, x, y, width, height, content, createdBy + optional style/metadata/safetyMetadata |
| `UpdateCanvasItemInput` | `itemId` + optional partial updates for x, y, width, height, content, style, metadata, safetyMetadata |

### Functions

**`createCanvasItem(input: CreateCanvasItemInput): Promise<CanvasItem>`**

The most important function in the application. It creates a new canvas item with sensible defaults:

```typescript
return prisma.canvasItem.create({
  data: {
    workspaceId: input.workspaceId,
    boardId: input.boardId,
    type: input.type,
    x: input.x, y: input.y,
    width: input.width, height: input.height,
    content: input.content,
    style: input.style ?? {},
    metadata: input.metadata ?? {},
    safetyMetadata: input.safetyMetadata ?? {},
    createdBy: input.createdBy,
  },
});
```

The `?? {}` pattern ensures JSON columns are never `DbNull` — they default to empty objects. Postgres handles this as `'{}'::jsonb`.

**`listCanvasItemsForBoard(boardId: string): Promise<CanvasItem[]>`**

Returns non-deleted items for a board, ordered by most recently updated:

```typescript
where: { boardId, deletedAt: null },
orderBy: { updatedAt: "desc" },
```

**`getCanvasItemById(itemId: string): Promise<CanvasItem | null>`**

Uses `findFirst` with `deletedAt: null` filter. Returns `null` if the item is soft-deleted or doesn't exist.

**`updateCanvasItem(input: UpdateCanvasItemInput): Promise<CanvasItem>`**

Partial update via `prisma.canvasItem.update()`. Only the fields provided in the input object are mutated — Prisma skips `undefined` values. This is how item moves and resizes work: the client sends only `x`, `y` if the user dragged the item.

**`softDeleteCanvasItem(itemId: string): Promise<CanvasItem>`**

Sets `deletedAt = new Date()`. The item row remains in the database but is excluded from all listing queries. This is not called "delete" — the function name is explicit about it being soft.

## `tasks.ts` (45 lines)

File: `src/db/tasks.ts`

### Types

**`CreateTaskInput`** includes `workspaceId`, optional `boardId`/`canvasItemId`, required `title`, optional `description`/`priority`/`dueAt`, required `createdBy`.

### Functions

**`createTask(input: CreateTaskInput): Promise<Task>`**

Creates a task with `priority` defaulting to `"normal"` if not provided. The `status` defaults to `"open"` at the database level (via `@default("open")` in the schema).

**`listOpenTasksForWorkspace(workspaceId: string): Promise<Task[]>`**

Returns tasks with `status: "open"`, ordered by due date ascending then last updated descending:

```typescript
orderBy: [{ dueAt: "asc" }, { updatedAt: "desc" }],
where: { status: "open", workspaceId },
```

Tasks with `dueAt: null` sort last due to PostgreSQL's `NULLS LAST` default behavior with `ASC`.

Note: `markTaskComplete` is handled by the API route (`/api/tasks/[id]`), not a separate helper function. The route uses `prisma.task.update()` directly.

## `reminders.ts` (43 lines)

File: `src/db/reminders.ts`

### Types

**`CreateReminderInput`** includes `workspaceId`, optional `boardId`/`canvasItemId`/`taskId`, required `title` and `remindAt`, required `createdBy`.

### Functions

**`createReminder(input: CreateReminderInput): Promise<Reminder>`**

Straightforward create with `status` defaulting to `"scheduled"` at the DB level.

**`listScheduledRemindersForWorkspace(workspaceId: string): Promise<Reminder[]>`**

Returns reminders with `status: "scheduled"`, ordered by `remindAt: asc` (soonest first). This is the query a future job scheduler would use to check "what reminders fire in the next N minutes."

## `chat.ts` (39 lines)

File: `src/db/chat.ts`

This module follows a slightly different pattern — it calls `getPrismaClient()` at module scope:

```typescript
const db = getPrismaClient();
```

This is fine here because the import is lazy-evaluated (the call happens when the module is first imported, not at parse time), and chat helpers are only loaded when `/api/chat` is hit.

### Functions

**`getOrCreateThreadForBoard(workspaceId: string, boardId: string | null)`**

Upserts a ChatThread by `workspaceId` + `boardId`:

```typescript
const existing = await db.chatThread.findFirst({
  where: { workspaceId, boardId: boardId ?? null },
  orderBy: { createdAt: "desc" },
});
if (existing) return existing;
return db.chatThread.create({
  data: { workspaceId, boardId: boardId ?? null },
});
```

The `boardId ?? null` handles the case where `boardId` is `undefined` (not provided). Prisma needs `null` to match the nullable column.

**`listMessagesForThread(threadId: string)`**

Returns all messages in a thread, ordered by `createdAt: asc` (oldest first — chronological chat order).

**`appendMessages(threadId: string, messages: { role, content, toolName?, toolStatus? }[])`**

Batch-inserts messages using `prisma.chatMessage.createMany()`. Returns early if the messages array is empty. This is the only bulk insert helper in the codebase — it's optimized for the chat use case where multiple messages (user prompt, assistant response, tool results) may be saved in one turn.

## `telegram.ts` (172 lines)

File: `src/db/telegram.ts`

The largest helper file. Handles the complete lifecycle of Telegram account linking.

### Functions

**`createTelegramLinkTokenRecord(input): Promise<IssuedTelegramLinkToken>`**

Generates a cryptographic token, hashes it, and stores the hash:

```typescript
const linkToken = createTelegramLinkToken(input.now);
const record = await prisma.telegramLinkToken.create({
  data: {
    expiresAt: linkToken.expiresAt,
    ownerUserId: input.ownerUserId,
    tokenHash: linkToken.tokenHash,
    workspaceId: input.workspaceId,
  },
});
```

The plaintext token is returned to the caller (to display in the UI) but **only the SHA-256 hash is persisted**. This means a database leak cannot expose usable link tokens.

**`consumeTelegramLinkToken(input): Promise<ConsumeTelegramLinkTokenResult>`**

The most complex helper in the codebase. This function:

1. Validates the token format (`isValidTelegramLinkTokenFormat`)
2. Hashes the plaintext token and looks up the record
3. Checks if the token is consumed or expired
4. Runs a **Prisma transaction** that atomically marks the token as consumed AND links the Telegram account

The transaction is critical — it prevents a race condition where two requests consume the same token:

```typescript
const result = await prisma.$transaction(async (tx) => {
  const consumedToken = await tx.telegramLinkToken.update({
    data: { consumedAt: now },
    where: { id: linkToken.id },
  });
  const account = await tx.telegramAccount.upsert({
    // create or re-activate the Telegram account
  });
  return { account, consumedToken };
});
```

The `upsert` on TelegramAccount handles re-linking: if the user previously unlinked, calling upsert sets `unlinkedAt: null` and updates the profile info.

The function catches `P2002` (unique constraint violation) from Prisma — this happens if the same Telegram user ID is already linked to a different app user.

**`getActiveTelegramAccount(telegramUserId: string): Promise<TelegramAccount | null>`**

Finds a linked, non-unlinked Telegram account by the Telegram user ID:

```typescript
where: { telegramUserId, unlinkedAt: null }
```

Used by the webhook handler to find the associated workspace before dispatching commands.

**`unlinkTelegramAccount(ownerUserId: string): Promise<TelegramAccount | null>`**

Sets `unlinkedAt = new Date()`. The account row remains for audit purposes. If the account is already unlinked or doesn't exist, returns the account as-is (no-op).

## `workspaces.ts` (53 lines)

File: `src/db/workspaces.ts`

### Functions

**`createWorkspace(input: CreateWorkspaceInput): Promise<Workspace>`**

Simple create with `ownerUserId` and `name`.

**`listWorkspacesForOwner(ownerUserId: string): Promise<Workspace[]>`**

Returns all workspaces for a user, ordered by `updatedAt: desc`.

**`getOrCreateWorkspaceForUser(ownerUserId: string, displayName: string): Promise<Workspace>`**

The critical function for auth flow. Called during signup and login:

```typescript
const existing = await prisma.workspace.findFirst({
  where: { ownerUserId },
  orderBy: { createdAt: "asc" },
});
if (existing) return existing;
return prisma.workspace.create({
  data: {
    ownerUserId,
    name: `${displayName}'s Workspace`,
  },
});
```

On first login for a new user, a workspace is auto-created with a friendly name. On subsequent logins, the existing workspace is returned. This means no user action is required to "create a workspace" — it's automatic.

## `widgets.ts` (62 lines)

File: `src/db/widgets.ts`

### Functions

**`createCustomHtmlWidgetDefinition(input): Promise<WidgetDefinition>`**

Creates a WidgetDefinition with hardcoded `kind: "custom_html"` and `renderStrategy: "sandboxed_iframe"`. This function is only for generated HTML widgets — built-in widgets have their definitions seeded elsewhere.

**`storeCustomHtmlWidgetSource(input)`**

Stores a versioned source snapshot for a widget. `riskLevel` defaults to `"low"` if not provided. The `@@unique([widgetDefinitionId, version])` constraint in the schema is enforced by Prisma — you cannot store two sources for the same definition-version pair.

## `audit.ts` (33 lines)

File: `src/db/audit.ts`

### Function

**`recordAuditEvent(input: RecordAuditEventInput): Promise<AuditEvent>`**

The simplest helper — a straightforward `create` with `metadata` defaulting to `{}`. The `actorType` union type includes `"telegram"` in addition to the standard `"user" | "assistant" | "system"`, reflecting that Telegram commands are a distinct actor category.

## What the Helpers Do NOT Do

The helper modules deliberately do not:
- **Check authorization** — that's the responsibility of API routes and session middleware. Helpers assume the caller has already verified workspace ownership.
- **Handle errors** — except for the `P2002` catch in `consumeTelegramLinkToken`, all Prisma errors bubble up.
- **Validate input** — that's the responsibility of the Tool Registry (`validate()` method) and API route handlers. Helpers trust that callers pass valid data.
- **Log anything** — no `console.log`, no telemetry.
- **Use transactions** — except for `consumeTelegramLinkToken`, which has a clear concurrency requirement.
