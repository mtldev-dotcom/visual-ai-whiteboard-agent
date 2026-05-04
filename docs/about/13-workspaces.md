# 13 — Workspaces

**Files:** `prisma/schema.prisma` (model), `src/db/workspaces.ts` (DB helpers)

The workspace is the top-level organizational unit in this application. Every piece of user data — boards, canvas items, tasks, reminders, chat threads, Telegram accounts, audit events — belongs to exactly one workspace.

## The Workspace model

```prisma
model Workspace {
  id          String   @id @default(cuid())
  ownerUserId String
  name        String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  owner              User                @relation(fields: [ownerUserId], references: [id], onDelete: Cascade)
  boards             Board[]
  canvasItems        CanvasItem[]
  widgets            WidgetInstance[]
  tasks              Task[]
  reminders          Reminder[]
  telegramLinkTokens TelegramLinkToken[]
  telegramAccounts   TelegramAccount[]
  auditEvents        AuditEvent[]
  chatThreads        ChatThread[]

  @@index([ownerUserId])
}
```

### Fields

| Field | Type | Purpose |
|---|---|---|
| `id` | `String (cuid)` | Primary key, auto-generated unique ID |
| `ownerUserId` | `String` | Foreign key to the owning User |
| `name` | `String` | Human-readable name, displayed in UI |
| `createdAt` | `DateTime` | When the workspace was created |
| `updatedAt` | `DateTime` | Auto-updated on any change to this row |

### Relations

The workspace owns (via cascade delete) every piece of data in the application:

| Relation | Model | Meaning |
|---|---|---|
| `boards` | Board[] | All boards in this workspace |
| `canvasItems` | CanvasItem[] | All canvas objects across all boards |
| `widgets` | WidgetInstance[] | All widget instances |
| `tasks` | Task[] | All tasks |
| `reminders` | Reminder[] | All scheduled reminders |
| `telegramLinkTokens` | TelegramLinkToken[] | Telegram linking tokens |
| `telegramAccounts` | TelegramAccount[] | Linked Telegram bot accounts |
| `auditEvents` | AuditEvent[] | All audit trail entries |
| `chatThreads` | ChatThread[] | All AI chat threads |

Every relation uses `onDelete: Cascade`. If a workspace is deleted, all its data is deleted with it. There is no orphaned data.

### Index

```prisma
@@index([ownerUserId])
```

The most common workspace lookup is "give me all workspaces for this user." The `ownerUserId` index makes this query efficient.

## One user, one workspace

The current model is deliberately simple: **one workspace per user, auto-created at signup time.** This is not a multi-workspace-per-user system (yet).

Why one workspace?
- The product is a personal productivity tool, not a team collaboration tool.
- Multi-workspace adds complexity (workspace switcher, permission models, cross-workspace sharing) with no immediate user benefit.
- Keeping the model simple means faster development and fewer bugs.

If multi-workspace is needed later, the schema already supports it (one User can have many Workspaces via `workspaces Workspace[]`). The change would be:
1. Add a workspace switcher UI.
2. During sign-in, let the user pick a workspace instead of auto-resolving the first one.
3. Possibly add workspace membership/sharing if team features are needed.

## The `workspaceId` pattern: multi-tenant isolation

Every data model in the application has a `workspaceId` field:

```prisma
model Board { workspaceId String ... }
model CanvasItem { workspaceId String ... }
model Task { workspaceId String ... }
model Reminder { workspaceId String ... }
model AuditEvent { workspaceId String ... }
model ChatThread { workspaceId String ... }
model WidgetInstance { workspaceId String ... }
model TelegramAccount { workspaceId String ... }
model TelegramLinkToken { workspaceId String ... }
```

This is a **shared-database, application-level multi-tenancy** pattern. All users' data lives in the same PostgreSQL database, but every query is scoped by `workspaceId`:

```typescript
// Every DB query includes workspaceId in the WHERE clause
const boards = await prisma.board.findMany({
  where: { workspaceId: session.workspaceId, archivedAt: null },
});

const tasks = await prisma.task.findMany({
  where: { workspaceId: session.workspaceId, status: "open" },
});
```

This pattern ensures:

- **Isolation:** User A cannot accidentally query User B's data — the `workspaceId` filter prevents it.
- **Simplicity:** No need for separate databases or schemas per user.
- **Performance:** A composite index on `(workspaceId, ...other fields)` makes scoped queries fast.

### How `workspaceId` flows through the system

```
1. Sign-in → workspace.id embedded in JWT token
2. Every API call → requireSession() extracts workspaceId from token
3. Every DB query → workspaceId used in WHERE clause
4. Audit events → workspaceId recorded for traceability
```

The `workspaceId` is **never** taken from the client request body or query parameters. It always comes from the server-side session. This prevents users from faking a different workspace:

```typescript
// CORRECT: workspaceId from session, never from request body
const { session, error } = await requireSession();
if (error) return error;
const board = await createBoard({
  workspaceId: session.workspaceId, // ← from server session
  title: body.title,
});

// WRONG: workspaceId from request body (would allow cross-workspace injection)
const board = await createBoard({
  workspaceId: body.workspaceId, // ← NEVER do this
  title: body.title,
});
```

## DB helpers (`src/db/workspaces.ts`)

### createWorkspace

```typescript
export type CreateWorkspaceInput = {
  ownerUserId: string;
  name: string;
};

export function createWorkspace(input: CreateWorkspaceInput): Promise<Workspace> {
  const prisma = getPrismaClient();
  return prisma.workspace.create({
    data: {
      ownerUserId: input.ownerUserId,
      name: input.name,
    },
  });
}
```

Used during signup to create the user's workspace. Called from `src/lib/signup.ts`.

### listWorkspacesForOwner

```typescript
export function listWorkspacesForOwner(ownerUserId: string): Promise<Workspace[]> {
  const prisma = getPrismaClient();
  return prisma.workspace.findMany({
    where: { ownerUserId },
    orderBy: { updatedAt: "desc" },
  });
}
```

Returns all workspaces owned by a user, ordered by most recently updated. Currently only returns one workspace (since we have a single-workspace model), but the API is future-proof for multi-workspace.

### getOrCreateWorkspaceForUser

```typescript
export async function getOrCreateWorkspaceForUser(
  ownerUserId: string,
  displayName: string,
): Promise<Workspace> {
  const prisma = getPrismaClient();
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
}
```

This is the idempotent "get or create" pattern used during sign-in:

1. Try to find the user's oldest workspace.
2. If found, return it.
3. If not found, create a new one named `"{user's name}'s Workspace"`.

This is called from the `authorize()` function in the credentials provider (see [10-credentials-provider.md](./10-credentials-provider.md)). It ensures every user always has a workspace, even if signup was interrupted or a migration added users without one.

The workspace name uses the user's display name (falling back to email) so the UI shows something meaningful rather than "Workspace #1."

## How workspace is resolved at sign-in time

The key design decision is that `workspaceId` is resolved **once** during sign-in and embedded in the JWT session token:

```typescript
// src/lib/auth.ts — inside authorize()
const workspace = await getOrCreateWorkspaceForUser(user.id, user.name ?? user.email);
return {
  id: user.id,
  email: user.email,
  name: user.name,
  workspaceId: workspace.id, // ← embedded in the token
};
```

This avoids a database lookup on every subsequent request. The trade-offs:

| Approach | Per-request DB hits | Handles workspace changes |
|---|---|---|
| Resolve at sign-in (current) | 0 | Requires re-auth to see new workspace |
| Look up on every request | 1 | Always current |

For a single-workspace-per-user model, the first approach wins. Workspaces don't change often, and avoiding a DB hit on every API call reduces latency meaningfully.

## Deleting a workspace

There is currently no UI for deleting a workspace, but the cascade relationships in the schema mean that when the API adds workspace deletion:

```typescript
await prisma.workspace.delete({ where: { id: workspaceId } });
```

This would cascade-delete: all boards, canvas items, tasks, reminders, widget instances, Telegram accounts, chat threads, audit events, and Telegram linking tokens.

## Workspace in the API

The workspace API endpoint at `src/app/api/workspace/route.ts` returns the current user's workspace info:

```
GET /api/workspace
→ requireSession()
→ find workspace by session.workspaceId
→ return { workspace: { id, name, createdAt, ... } }
```

**Next:** [14-boards.md](./14-boards.md) — the board model, CRUD operations, templates, and the BoardExplorer component.
