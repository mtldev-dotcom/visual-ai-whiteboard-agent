# 49 — Canvas Items API (`/api/canvas-items`)

The canvas items API manages the objects that appear on the whiteboard canvas — sticky notes, text boxes, task lists, kanban boards, markdown blocks, images, links, iframe embeds, HTML widgets, board links, and sections.

## Files referenced

- `src/app/api/canvas-items/route.ts` — POST (create a new item)
- `src/app/api/canvas-items/[id]/route.ts` — PATCH (update), DELETE (soft-delete)
- `src/db/canvas-items.ts` — database functions for item operations

## POST /api/canvas-items — Create a canvas item

Creates a new canvas item on a specific board. This is the most validation-heavy endpoint in the API because it sanitizes user/LLM-provided data against a strict allowlist.

### Flow

1. `requireSession()`
2. Parse body: `{ boardId?, type?, x?, y?, width?, height?, content? }`
3. Validate `boardId` is present (400 if missing)
4. Validate `type` is in `VALID_TYPES` allowlist (400 if not)
5. Fetch board, verify workspace ownership (404 if not found or wrong workspace)
6. Apply defaults: `x=32`, `y=32`, `width=260`, `height=160`, `content={}`
7. Create via `createCanvasItem()` with `createdBy: "user"`
8. Return `{ item }` with status 201

### Implementation

```typescript
import { NextResponse } from "next/server";
import { getBoardById } from "@/db/boards";
import { createCanvasItem } from "@/db/canvas-items";
import type { Prisma } from "@/generated/prisma/client";
import { requireSession } from "@/lib/session";

const VALID_TYPES = [
  "text",
  "sticky_note",
  "markdown",
  "image",
  "link",
  "iframe_embed",
  "html_widget",
  "task_list",
  "board_link",
  "section",
  "kanban",
];

export async function POST(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = (await request.json()) as {
    boardId?: string;
    type?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    content?: Record<string, unknown>;
  };

  if (!body.boardId) {
    return NextResponse.json(
      { error: "boardId is required." },
      { status: 400 }
    );
  }

  if (!body.type || !VALID_TYPES.includes(body.type)) {
    return NextResponse.json(
      { error: `type must be one of: ${VALID_TYPES.join(", ")}.` },
      { status: 400 }
    );
  }

  const board = await getBoardById(body.boardId);
  if (!board || board.workspaceId !== session.workspaceId) {
    return NextResponse.json(
      { error: "Board not found." },
      { status: 404 }
    );
  }

  const item = await createCanvasItem({
    boardId: body.boardId,
    content: (body.content ?? {}) as Prisma.InputJsonValue,
    createdBy: "user",
    height: body.height ?? 160,
    type: body.type,
    width: body.width ?? 260,
    workspaceId: session.workspaceId,
    x: body.x ?? 32,
    y: body.y ?? 32,
  });

  return NextResponse.json({ item }, { status: 201 });
}
```

### Default geometry

Every new item starts at coordinates `(32, 32)` with dimensions `260×160` if the caller does not provide explicit geometry:

```typescript
x: body.x ?? 32,
y: body.y ?? 32,
width: body.width ?? 260,
height: body.height ?? 160,
```

**Why these defaults.** `(32, 32)` places the item near the top-left of the canvas grid (which uses a 32px tile size). `260×160` provides a reasonable default size that works for most content types. The assistant (LLM) can override these with explicit `x`, `y`, `width`, `height` values.

### VALID_TYPES allowlist

Items are only created if `type` matches one of the 11 allowed values. This is a security boundary — unknown types could enable unexpected behavior in the canvas renderer. The allowlist is:

| Type | Description |
|------|-------------|
| `text` | Plain text block |
| `sticky_note` | Colored sticky note with text |
| `markdown` | Rendered Markdown content |
| `image` | Image embed |
| `link` | URL bookmark/card |
| `iframe_embed` | Embedded external page |
| `html_widget` | Custom HTML widget (sandboxed iframe) |
| `task_list` | Interactive task list |
| `board_link` | Link to another board |
| `section` | Section divider/header |
| `kanban` | Kanban board widget |

### createdBy marker

Every item is created with `createdBy: "user"`. When the assistant creates items through the chat interface, it still flows through this endpoint and is marked `"user"` because the assistant acts on behalf of the user. The `createdBy` field is tracked for audit purposes; future iterations may distinguish `"assistant"` as a separate value.

### Content as JSON

The `content` field is typed as `Record<string, unknown>` and stored as a JSON column in the database (via Prisma's `InputJsonValue`). Different item types have different content shapes:

```typescript
// sticky_note
{ "text": "Buy groceries", "color": "#FFD700" }

// markdown
{ "text": "# Heading\n\nContent here" }

// task_list
{ "tasks": [{ "text": "Design homepage", "done": false }] }

// kanban
{ "columns": [{ "title": "Todo", "cards": [...] }] }
```

The API does not validate the content shape per type — that is left to the canvas renderer and the LLM adaptation layer.

## PATCH /api/canvas-items/[id] — Update a canvas item

Partially updates a canvas item's geometry, content, or style.

### Flow

1. `requireSession()`
2. Resolve `{ id }` from `await params`
3. Fetch item, check `item.workspaceId !== session.workspaceId` → 404
4. Parse body: `{ x?, y?, width?, height?, content? }`
5. Update via `updateCanvasItem()`
6. Return `{ item: updated }`

### Implementation

```typescript
export async function PATCH(request: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const item = await getCanvasItemById(id);

  if (!item || item.workspaceId !== session.workspaceId) {
    return NextResponse.json(
      { error: "Item not found." },
      { status: 404 }
    );
  }

  const body = (await request.json()) as {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    content?: Record<string, unknown>;
  };

  const updated = await updateCanvasItem({
    itemId: id,
    x: body.x,
    y: body.y,
    width: body.width,
    height: body.height,
    content: body.content as Prisma.InputJsonValue | undefined,
  });

  return NextResponse.json({ item: updated });
}
```

All fields are optional — only provided fields are updated. If `x` is provided but `y` is not, only the x-coordinate changes.

### LLM-driven updates

The assistant's `update_canvas_item` tool flows through this endpoint. The LLM adapter maps the assistant's tool calls to HTTP requests. This means the same validation, ownership checks, and response shapes apply whether the user is dragging an item in the UI or the assistant is rearranging items via chat.

## DELETE /api/canvas-items/[id] — Soft-delete a canvas item

Marks an item as deleted without removing it from the database.

```typescript
export async function DELETE(_req: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const item = await getCanvasItemById(id);

  if (!item || item.workspaceId !== session.workspaceId) {
    return NextResponse.json(
      { error: "Item not found." },
      { status: 404 }
    );
  }

  await softDeleteCanvasItem(id);
  return NextResponse.json({ ok: true });
}
```

**Why soft delete.** Like boards, canvas items are soft-deleted to support undo and recovery. The `softDeleteCanvasItem` function sets a `deletedAt` timestamp or archived flag (depending on the schema), and list queries exclude soft-deleted items by default.

## Error states

| Scenario | Status | Response |
|----------|--------|----------|
| Not authenticated | 401 | `{ error: "Unauthorized." }` |
| Missing boardId | 400 | `{ error: "boardId is required." }` |
| Invalid or missing type | 400 | `{ error: "type must be one of: text, sticky_note, ..." }` |
| Board not found / wrong workspace | 404 | `{ error: "Board not found." }` |
| Item not found / wrong workspace | 404 | `{ error: "Item not found." }` |

## Canvas items are loaded via GET /api/boards/[id]

There is no separate `GET /api/canvas-items` endpoint. Instead, canvas items for a board are loaded as part of the board fetch:

```typescript
// src/app/api/boards/[id]/route.ts
const canvasItems = await listCanvasItemsForBoard(id);
return NextResponse.json({ board, canvasItems });
```

**Why.** Loading the board and its items in a single request avoids a waterfall. The `BoardCanvas` component receives both the board and its items from the same fetch.

## Item lifecycle summary

```
POST /api/canvas-items        →  Creates item (status 201)
                                   │
GET /api/boards/[id]           →  Loads board + all items
                                   │
PATCH /api/canvas-items/[id]   →  Updates geometry/content
                                   │
DELETE /api/canvas-items/[id]  →  Soft-deletes item
```

Every canvas item has:
- Stable ID (UUID)
- `boardId` (which board it belongs to)
- `workspaceId` (for ownership verification)
- `type` (one of VALID_TYPES)
- Geometry (`x`, `y`, `width`, `height`)
- `content` (JSON payload specific to type)
- `style` (CSS-like style payload)
- `metadata` (arbitrary key-value pairs)
- `safetyMetadata` (permission/sandbox flags)
- `createdBy` marker
- `createdAt` / `updatedAt` timestamps
