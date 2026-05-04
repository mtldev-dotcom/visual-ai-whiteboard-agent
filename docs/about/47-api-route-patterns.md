# 47 — API Route Patterns

Every API route handler in this project follows a strict, predictable pattern. Understanding this pattern is the fastest way to understand any endpoint in the codebase and the correct way to add new endpoints.

## Files referenced

- `src/lib/session.ts` — `requireSession()` helper, `AppSession` type
- `src/lib/auth.ts` — `authOptions` for NextAuth
- All route files under `src/app/api/**/route.ts`

## The canonical route shape

```
src/app/api/<resource>/route.ts    → GET, POST (collection)
src/app/api/<resource>/[id]/route.ts → GET, PATCH, DELETE (single)
```

Each file exports named async functions matching HTTP methods. No `export default`. No class-based handlers.

```typescript
// src/app/api/some-resource/route.ts
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";

export async function GET(request: Request) {
  // pattern starts here
}

export async function POST(request: Request) {
  // same pattern
}
```

Dynamic segments use the Next.js 15 `params: Promise` shape:

```typescript
// src/app/api/some-resource/[id]/route.ts
type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  // ...
}
```

## Step 1: Require session (every route)

Every protected route starts with the same two lines:

```typescript
const { session, error } = await requireSession();
if (error) return error;
```

**Why.** `requireSession()` is defined in `src/lib/session.ts:12`. It calls `getServerSession(authOptions)` from `next-auth`. If the user is not authenticated or has no workspace, it returns `{ session: null, error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) }`. If authenticated, it returns `{ session: AppSession, error: null }` where `AppSession` contains `userId`, `workspaceId`, and `email`.

This pattern means every handler has session context immediately available. You never need to check `session` for null — if `error` is null, `session` is present. TypeScript enforces this via the union return type.

**Exception.** The health endpoint (`src/app/api/health/route.ts`) does NOT call `requireSession()` — it is a public endpoint used by Docker health checks and deployment platform pings. The signup route (`src/app/api/auth/signup/route.ts`) also does NOT call `requireSession()` — it creates the session.

## Step 2: Validate input

All routes validate inputs explicitly. No implicit fallthroughs.

### Query params (GET)

```typescript
const { searchParams } = new URL(request.url);
const q = searchParams.get("q")?.trim() ?? "";
```

Used in `GET /api/boards`, `GET /api/chat/thread`, etc.

### JSON body (POST, PATCH)

```typescript
const body = (await request.json()) as {
  title?: string;
  description?: string;
};
```

Type assertions with `as` (not runtime validation with Zod). This is a deliberate trade-off: the project trusts that API consumers (the UI code and the LLM adapter) send correct shapes. For external-facing endpoints (signup, Telegram webhook), extra validation is added inline.

### Required field checks

```typescript
if (!body.title?.trim()) {
  return NextResponse.json(
    { error: "title is required." },
    { status: 400 }
  );
}
```

Every field that is required is checked with an explicit `if` guard, and a 400 is returned with a human-readable error message.

### Allowlist validation

For fields with a fixed set of valid values, an allowlist array is used:

```typescript
const VALID_TYPES = [
  "text", "sticky_note", "markdown", "image", "link",
  "iframe_embed", "html_widget", "task_list", "board_link",
  "section", "kanban",
];

if (!body.type || !VALID_TYPES.includes(body.type)) {
  return NextResponse.json(
    { error: `type must be one of: ${VALID_TYPES.join(", ")}.` },
    { status: 400 }
  );
}
```

Source: `src/app/api/canvas-items/route.ts:8-20`.

## Step 3: Workspace ownership check

Every board-specific or item-specific operation verifies that the resource belongs to the session's workspace **before** performing the operation.

```typescript
const board = await getBoardById(id);
if (!board || board.workspaceId !== session.workspaceId) {
  return NextResponse.json(
    { error: "Board not found." },
    { status: 404 }
  );
}
```

**Why this matters.** Without this check, a user could guess or enumerate IDs and access other users' data. The check returns 404 (not 401) to avoid leaking whether a resource exists in another workspace.

**Collection endpoints** (e.g. `GET /api/boards`) don't need this check because the database query already scopes to `session.workspaceId`:

```typescript
const boards = await listBoardsForWorkspace(session.workspaceId);
```

For item operations, ownership is checked directly on the `workspaceId` field. For board operations, the check is `board.workspaceId !== session.workspaceId`. For canvas items, `item.workspaceId !== session.workspaceId`.

**Tasks** use a combined query instead of a separate check:

```typescript
const task = await prisma.task.findFirst({
  where: { id, workspaceId: session.workspaceId },
});
if (!task) {
  return NextResponse.json({ error: "Task not found." }, { status: 404 });
}
```

Source: `src/app/api/tasks/[id]/route.ts:15-21`.

## Step 4: Execute operation

After validation and ownership checks, the handler calls the appropriate database function and returns the result.

```typescript
const board = await createBoard({
  title: body.title.trim(),
  description: body.description,
  workspaceId: session.workspaceId,
  createdBy: "user",
});

return NextResponse.json({ board }, { status: 201 });
```

Database functions are imported from `@/db/*` modules (see `src/db/`):

| Module | Functions |
|--------|-----------|
| `@/db/boards` | `getBoardById`, `listBoardsForWorkspace`, `searchBoardsForWorkspace`, `createBoard`, `createSubBoard`, `updateBoard`, `archiveBoard` |
| `@/db/canvas-items` | `getCanvasItemById`, `createCanvasItem`, `updateCanvasItem`, `softDeleteCanvasItem`, `listCanvasItemsForBoard` |
| `@/db/chat` | `getOrCreateThreadForBoard`, `listMessagesForThread`, `appendMessages` |

## Response conventions

### Status codes

| Status | Meaning | When |
|--------|---------|------|
| 200 | OK | Successful GET, PATCH |
| 201 | Created | Successful POST (resource created) |
| 400 | Bad Request | Missing required fields, invalid input |
| 401 | Unauthorized | No session (handled by `requireSession()`) |
| 403 | Forbidden | Signup disabled (`APP_SIGNUP` gate) |
| 404 | Not Found | Resource doesn't exist or doesn't belong to workspace |
| 409 | Conflict | Duplicate email during signup |
| 500 | Internal Server Error | Unexpected errors in signup |
| 503 | Service Unavailable | LLM adapter errors (see chat API) |

### Error shape

All errors return `{ error: "message" }`. The message is always a human-readable string, never a code or enum.

```typescript
// Consistent shape everywhere:
{ error: "title is required." }
{ error: "Board not found." }
{ error: "Unauthorized." }
{ error: "Signup is currently disabled." }
```

### Success shape

Resources are returned nested under a key:

```typescript
{ board: { ... } }
{ boards: [ ... ] }
{ item: { ... } }
{ tasks: [ ... ] }
{ ok: true }
{ threadId: "...", messages: [ ... ] }
{ workspaceId: "...", userId: "...", boardCount: 3 }
```

## Full example: PATCH /api/canvas-items/[id]

Here's the complete PATCH handler showing every step of the pattern:

```typescript
// src/app/api/canvas-items/[id]/route.ts

import { NextResponse } from "next/server";
import { getCanvasItemById, updateCanvasItem } from "@/db/canvas-items";
import { requireSession } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  // Step 1: Require session
  const { session, error } = await requireSession();
  if (error) return error;

  // Step 2: Resolve dynamic params
  const { id } = await params;

  // Step 3: Ownership check
  const item = await getCanvasItemById(id);
  if (!item || item.workspaceId !== session.workspaceId) {
    return NextResponse.json(
      { error: "Item not found." },
      { status: 404 }
    );
  }

  // Step 4: Parse body
  const body = (await request.json()) as {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    content?: Record<string, unknown>;
  };

  // Step 5: Execute operation
  const updated = await updateCanvasItem({
    itemId: id,
    x: body.x,
    y: body.y,
    width: body.width,
    height: body.height,
    content: body.content,
  });

  // Step 6: Return response
  return NextResponse.json({ item: updated });
}
```

## Deviation: DELETE returns { ok: true }

DELETE handlers follow the pattern but return `{ ok: true }` with 200 instead of the deleted resource. This is consistent with REST conventions where DELETE does not return a body:

```typescript
export async function DELETE(_req: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const item = await getCanvasItemById(id);
  if (!item || item.workspaceId !== session.workspaceId) {
    return NextResponse.json({ error: "Item not found." }, { status: 404 });
  }

  await softDeleteCanvasItem(id);
  return NextResponse.json({ ok: true });
}
```

## The session helper in detail

`src/lib/session.ts` is 32 lines and is one of the most important files in the project:

```typescript
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

export type AppSession = {
  userId: string;
  workspaceId: string;
  email: string;
};

export async function requireSession(): Promise<
  { session: AppSession; error: null }
  | { session: null; error: NextResponse }
> {
  const raw = await getServerSession(authOptions);

  if (!raw?.user?.id || !raw.user.workspaceId) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      ),
      session: null,
    };
  }

  return {
    error: null,
    session: {
      email: raw.user.email,
      userId: raw.user.id,
      workspaceId: raw.user.workspaceId,
    },
  };
}
```

**Why the discriminated union return type.** TypeScript narrows the type after the `if (error) return error;` check. In all code after that check, `session` is guaranteed to be `AppSession`, and `error` is `null`. This is the canonical TypeScript pattern for "either success data or an error response."

The `workspaceId` comes from the NextAuth session callback, which extends the default session with `raw.user.workspaceId`. This means every authenticated request automatically has workspace context without an extra database lookup.

## Why this pattern matters

1. **Predictability.** Every route looks the same. A developer skimming the codebase can immediately find the session check, the validation, the ownership check, and the operation.

2. **Security.** The session → ownership pattern cannot be skipped. Every new route that follows this template is protected by default.

3. **Testability.** Each step is a small, independent operation. You can test session handling, validation, ownership checks, and database operations separately.

4. **Consistency.** LLM tools and UI code can rely on the same error shapes and the same status code semantics across every endpoint.

When adding a new API route, start by copying the structure from an existing route that handles the same HTTP method and resource type (collection vs single). The pattern is the same in every case.

## What this pattern does NOT cover

- **Streaming responses.** The chat endpoint uses a parallel tool-calling loop, but the request/response boundary still uses `NextResponse.json()`.
- **File uploads.** Not yet implemented; would use `request.formData()` instead of `request.json()`.
- **Webhooks.** The Telegram webhook endpoint follows a different pattern (see chapter 53) because it authenticates via a secret token, not via NextAuth sessions.
- **WebSocket/real-time.** Not implemented. Would require a different transport and auth model.
