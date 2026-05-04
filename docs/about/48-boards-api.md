# 48 — Boards API (`/api/boards`)

The boards API provides CRUD operations for the board collection and individual boards. It is the primary entry point for board management in the workspace.

## Files referenced

- `src/app/api/boards/route.ts` — collection routes (GET list/search, POST create)
- `src/app/api/boards/[id]/route.ts` — single board routes (GET, PATCH, DELETE)
- `src/db/boards.ts` — database functions for board operations

## GET /api/boards — List or search boards

Lists all boards in the user's workspace. Optionally filters by a search query.

### Flow

1. `requireSession()` — every protected route starts here
2. Parse `?q=` from the URL search params
3. If `q` is present → call `searchBoardsForWorkspace(session.workspaceId, q)`
4. If `q` is absent → call `listBoardsForWorkspace(session.workspaceId)`
5. Return `{ boards: Board[] }`

### Implementation

```typescript
import { NextResponse } from "next/server";
import {
  createBoard,
  createSubBoard,
  listBoardsForWorkspace,
  searchBoardsForWorkspace,
} from "@/db/boards";
import { requireSession } from "@/lib/session";

export async function GET(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  const boards = q
    ? await searchBoardsForWorkspace(session.workspaceId, q)
    : await listBoardsForWorkspace(session.workspaceId);

  return NextResponse.json({ boards });
}
```

### Search behavior

The search is invoked from the `BoardExplorer` component with a 300ms debounce:

```typescript
// src/app/components/BoardExplorer.tsx:50-57
const res = await fetch(`/api/boards?q=${encodeURIComponent(q)}`);
const data = (await res.json()) as { boards?: Board[] };
setSearchResults(data.boards ?? []);
```

The `searchBoardsForWorkspace` database function performs a case-insensitive search across board titles, scoped to the workspace. An empty or whitespace-only `q` parameter triggers the full list path (no search), so client-side code does not need to guard against empty queries.

**Why both search and list in one endpoint.** Both operations return the same shape (`{ boards: Board[] }`) and share the same session/workspace scope. A query param discriminator keeps the API surface small.

### Response

```json
{
  "boards": [
    { "id": "...", "title": "Project Alpha", "parentBoardId": null },
    { "id": "...", "title": "Sprint 3", "parentBoardId": "<parent_id>" }
  ]
}
```

The `Board` type includes `parentBoardId: string | null`. Boards with a non-null `parentBoardId` are sub-boards and are rendered nested in the `BoardExplorer` tree view.

## POST /api/boards — Create a board (or sub-board)

Creates a new board. If `parentBoardId` is provided, creates a sub-board instead.

### Flow

1. `requireSession()`
2. Parse body: `{ title?, description?, parentBoardId? }`
3. Validate `title` is non-empty (400 if missing)
4. If `parentBoardId` is present → `createSubBoard({ workspaceId, title, description, parentBoardId, createdBy: "user" })`
5. If `parentBoardId` is absent → `createBoard({ workspaceId, title, description, createdBy: "user" })`
6. Return `{ board }` with status 201

### Implementation

```typescript
export async function POST(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = (await request.json()) as {
    title?: string;
    description?: string;
    parentBoardId?: string;
  };

  if (!body.title?.trim()) {
    return NextResponse.json(
      { error: "title is required." },
      { status: 400 }
    );
  }

  const board = body.parentBoardId
    ? await createSubBoard({
        createdBy: "user",
        description: body.description,
        parentBoardId: body.parentBoardId,
        title: body.title.trim(),
        workspaceId: session.workspaceId,
      })
    : await createBoard({
        createdBy: "user",
        description: body.description,
        title: body.title.trim(),
        workspaceId: session.workspaceId,
      });

  return NextResponse.json({ board }, { status: 201 });
}
```

### Why conditional createBoard vs createSubBoard

`createBoard` creates a top-level board. `createSubBoard` creates a board with a `parentBoardId` link, which the `BoardExplorer` renders as a nested item under its parent. The conditional avoids two separate endpoints for what is semantically "create a board."

### Client usage (BoardExplorer)

```typescript
// src/app/components/BoardExplorer.tsx:65-86
const res = await fetch("/api/boards", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ title }),
});
const data = (await res.json()) as { board?: Board; error?: string };
if (data.board) {
  setBoards((prev) => [data.board!, ...prev]);
  onBoardCreated(data.board!);
  onBoardSelect(data.board!.id);
}
```

## GET /api/boards/[id] — Get a single board with its canvas items

Fetches a board by ID, including all canvas items on the board. This is the endpoint used when the `BoardCanvas` component loads or switches boards.

### Flow

1. `requireSession()`
2. Resolve `{ id }` from `await params`
3. `getBoardById(id)` — fetch the board
4. Workspace ownership check: `board.workspaceId !== session.workspaceId` → 404
5. `listCanvasItemsForBoard(id)` — fetch items
6. Return `{ board, canvasItems }`

### Implementation

```typescript
export async function GET(_req: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const board = await getBoardById(id);

  if (!board || board.workspaceId !== session.workspaceId) {
    return NextResponse.json(
      { error: "Board not found." },
      { status: 404 }
    );
  }

  const canvasItems = await listCanvasItemsForBoard(id);
  return NextResponse.json({ board, canvasItems });
}
```

**Why return canvasItems with the board.** Loading the board and its items in one request avoids a waterfall: the client gets everything it needs to render the canvas in a single fetch.

## PATCH /api/boards/[id] — Update board title and description

Updates a board's metadata. Does not touch canvas items.

### Flow

1. `requireSession()`
2. Resolve `{ id }`
3. Ownership check
4. Parse body: `{ title?, description? }`
5. `updateBoard({ boardId: id, title, description })`
6. Return `{ board: updated }`

### Implementation

```typescript
export async function PATCH(request: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const board = await getBoardById(id);

  if (!board || board.workspaceId !== session.workspaceId) {
    return NextResponse.json(
      { error: "Board not found." },
      { status: 404 }
    );
  }

  const body = (await request.json()) as {
    title?: string;
    description?: string | null;
  };
  const updated = await updateBoard({
    boardId: id,
    title: body.title,
    description: body.description,
  });
  return NextResponse.json({ board: updated });
}
```

Note that `description` can be set to `null` to clear it (`string | null` type). The `title` is optional — if not provided, it remains unchanged.

## DELETE /api/boards/[id] — Archive a board

Soft-deletes a board by archiving it (data is preserved, board is hidden from list queries).

### Implementation

```typescript
export async function DELETE(_req: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const board = await getBoardById(id);

  if (!board || board.workspaceId !== session.workspaceId) {
    return NextResponse.json(
      { error: "Board not found." },
      { status: 404 }
    );
  }

  await archiveBoard(id);
  return NextResponse.json({ ok: true });
}
```

**Why soft delete (archive) instead of hard delete.** Board data is valuable. Archiving preserves the data in the database while removing it from the UI, allowing future undo or admin recovery. The `archiveBoard` function marks the board as archived rather than deleting the row.

## Error states

| Scenario | Status | Response |
|----------|--------|----------|
| Not authenticated | 401 | `{ error: "Unauthorized." }` |
| Missing title on create | 400 | `{ error: "title is required." }` |
| Board not found or wrong workspace | 404 | `{ error: "Board not found." }` |

## Data flow diagram

```
BoardExplorer (client)
  │
  ├─ GET /api/boards?q=...    → searchBoardsForWorkspace()
  ├─ GET /api/boards           → listBoardsForWorkspace()
  └─ POST /api/boards          → createBoard() / createSubBoard()
                                   ↓
BoardCanvas (client)
  │
  └─ GET /api/boards/[id]      → getBoardById() + listCanvasItemsForBoard()
```

The board data type used throughout the app:

```typescript
type Board = {
  id: string;
  title: string;
  parentBoardId: string | null;
};
```

Only the fields needed for display and routing are included. Full board metadata (description, timestamps, etc.) is available via `GET /api/boards/[id]`.
