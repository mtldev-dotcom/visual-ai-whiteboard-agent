# 15 — Canvas Items

**Files:** `prisma/schema.prisma` (model), `src/db/canvas-items.ts` (CRUD)

Canvas items are the heart of the application. Every visual element on a board — sticky notes, task lists, kanban boards, images, links, HTML widgets — is a CanvasItem record.

## The CanvasItem model

```prisma
model CanvasItem {
  id             String    @id @default(cuid())
  workspaceId    String
  boardId        String
  type           String
  x              Float
  y              Float
  width          Float
  height         Float
  content        Json
  style          Json      @default("{}")
  metadata       Json      @default("{}")
  safetyMetadata Json      @default("{}")
  createdBy      String
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  deletedAt      DateTime?

  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  board     Board     @relation(fields: [boardId], references: [id], onDelete: Cascade)

  @@index([workspaceId])
  @@index([boardId])
  @@index([type])
}
```

### Core fields

| Field | Type | Purpose |
|---|---|---|
| `id` | `String (cuid)` | Unique ID |
| `workspaceId` | `String` | Multi-tenant isolation |
| `boardId` | `String` | Which board this item is on |
| `type` | `String` | What kind of item (see below) |
| `x`, `y` | `Float` | Position on the infinite canvas grid |
| `width`, `height` | `Float` | Bounding box dimensions |
| `content` | `Json` | Type-specific payload (see below) |
| `style` | `Json` | Visual styling properties |
| `metadata` | `Json` | Application-level metadata |
| `safetyMetadata` | `Json` | Permission/safety flags |
| `createdBy` | `String` | Actor: `user`, `assistant`, `system`, `import` |
| `deletedAt` | `DateTime?` | Soft delete timestamp |

### Indexes

```prisma
@@index([workspaceId])
@@index([boardId])
@@index([type])
```

- `workspaceId`: Workspace-scoped queries.
- `boardId`: Listing all items on a board (most common query — `listCanvasItemsForBoard`).
- `type`: Filtering items by type (e.g., "show all kanban boards on this board").

## Allowed types

The `type` field is a free-form string constrained by the application, not the database. The allowed values are:

| Type | Purpose | Content structure |
|---|---|---|
| `sticky_note` | Colored note with title and body text | `{ title: string, text: string }` |
| `task_list` | Checklist with title and tasks | `{ title: string, tasks: { completed: bool, title: string }[] }` |
| `kanban` | Kanban board with columns and nested cards | `{ title: string, columns: { id: string, title: string, cards: { id: string, title: string }[] }[] }` |
| `markdown` | Markdown-rendered text block | `{ markdown: string }` |
| `image` | Embedded image | `{ src: string, alt: string }` |
| `link` | Hyperlink card | `{ href: string, title: string }` |
| `html_widget` | Custom HTML widget (iframed) | `{ widgetId?: string, source?: string }` |
| `text` | Plain text label | `{ text: string }` |

### Content schemas by type

**sticky_note:**
```json
{
  "title": "Project Goals",
  "text": "What does success look like?\n\n1. \n2. \n3. "
}
```

**task_list:**
```json
{
  "title": "Launch Checklist",
  "tasks": [
    { "completed": false, "title": "Define scope" },
    { "completed": true, "title": "Assign owners" }
  ]
}
```

**kanban:**
```json
{
  "title": "Sprint Board",
  "columns": [
    {
      "id": "backlog",
      "title": "Backlog",
      "cards": [{ "id": "b1", "title": "Research phase" }]
    },
    {
      "id": "doing",
      "title": "In Progress",
      "cards": []
    }
  ]
}
```

Each card within a kanban column has a unique `id` so the frontend can track drag-and-drop between columns.

**image:**
```json
{
  "src": "https://example.com/uploads/photo.png",
  "alt": "Screenshot of dashboard"
}
```

**link:**
```json
{
  "href": "https://docs.google.com/document/d/abc",
  "title": "Design Spec"
}
```

**html_widget:**
```json
{
  "widgetId": "inst_abc123"
}
```

HTML widgets reference a `WidgetInstance` by ID rather than embedding raw HTML. The widget is rendered in a sandboxed iframe. Widget permissions are managed separately (see the WidgetInstance model).

## Style and metadata

### style (Json, default `{}`)

Visual properties that affect rendering. Not type-enforced — the frontend can store whatever it needs:

```json
{
  "backgroundColor": "#ffeb3b",
  "fontSize": 14,
  "borderRadius": 8,
  "rotation": 0
}
```

Default is an empty object `{}` — the frontend applies its own defaults when `style` is missing or sparse.

### metadata (Json, default `{}`)

Application-level metadata that doesn't affect rendering:

```json
{
  "tags": ["important", "review"],
  "source": "imported-from-notion",
  "version": 2
}
```

### safetyMetadata (Json, default `{}`)

Security and permission flags. Primarily used for `html_widget` items:

```json
{
  "riskLevel": "low",
  "needsApproval": false,
  "allowedPermissions": []
}
```

For non-widget items, this is typically `{}`.

## Soft delete pattern

```typescript
export function softDeleteCanvasItem(itemId: string): Promise<CanvasItem> {
  return prisma.canvasItem.update({
    where: { id: itemId },
    data: { deletedAt: new Date() },
  });
}
```

Canvas items are **never** hard-deleted from the database. Deletion sets `deletedAt` to the current timestamp. All read queries filter `deletedAt: null`:

```typescript
where: {
  boardId,
  deletedAt: null,  // ← filters out soft-deleted items
}
```

Why soft delete?

| Hard delete | Soft delete (chosen) |
|---|---|
| Data is permanently gone | Data is recoverable |
| No undo possible | Undo is possible by setting `deletedAt: null` |
| Breaks references in audit events | Audit events still reference valid IDs |
| Fast to implement | Slightly more complex queries |

The undo feature simply updates the item to set `deletedAt: null` again.

## CRUD operations (`src/db/canvas-items.ts`)

### createCanvasItem

```typescript
export function createCanvasItem(
  input: CreateCanvasItemInput,
): Promise<CanvasItem> {
  return prisma.canvasItem.create({
    data: {
      workspaceId: input.workspaceId,
      boardId: input.boardId,
      type: input.type,
      x: input.x,
      y: input.y,
      width: input.width,
      height: input.height,
      content: input.content,
      style: input.style ?? {},
      metadata: input.metadata ?? {},
      safetyMetadata: input.safetyMetadata ?? {},
      createdBy: input.createdBy,
    },
  });
}
```

All three Json fields default to `{}` if not provided. This simplifies the API — callers don't need to send empty objects.

### listCanvasItemsForBoard

```typescript
export function listCanvasItemsForBoard(boardId: string): Promise<CanvasItem[]> {
  return prisma.canvasItem.findMany({
    where: {
      boardId,
      deletedAt: null,
    },
    orderBy: { updatedAt: "desc" },
  });
}
```

The most common query: "show me everything on this board." Returns all non-deleted items ordered by recency. The frontend uses this to render the board's canvas.

### getCanvasItemById

```typescript
export function getCanvasItemById(itemId: string): Promise<CanvasItem | null> {
  return prisma.canvasItem.findFirst({
    where: {
      id: itemId,
      deletedAt: null,
    },
  });
}
```

### updateCanvasItem

```typescript
export function updateCanvasItem(
  input: UpdateCanvasItemInput,
): Promise<CanvasItem> {
  return prisma.canvasItem.update({
    where: { id: input.itemId },
    data: {
      x: input.x,
      y: input.y,
      width: input.width,
      height: input.height,
      content: input.content,
      style: input.style,
      metadata: input.metadata,
      safetyMetadata: input.safetyMetadata,
    },
  });
}
```

Partial update — only the fields provided are changed. The frontend can send just `{ itemId, x: 150, y: 200 }` to move an item without affecting its content.

## Created-by markers

Every canvas item has a `createdBy` field that records who created it:

| Value | Meaning |
|---|---|
| `user` | Placed by the human user via UI interaction |
| `assistant` | Created by the AI assistant via a tool call |
| `system` | Created programmatically (templates, onboarding) |
| `import` | Imported from an external source |

This marker is displayed subtly in the UI (e.g., an icon next to the item) and is recorded in audit events. It helps users understand which items they created and which the AI created.

## Workspace ownership verification

All canvas item operations verify workspace ownership at the API level:

```typescript
const { session, error } = await requireSession();
if (error) return error;

const item = await getCanvasItemById(itemId);
if (!item || item.workspaceId !== session.workspaceId) {
  return NextResponse.json({ error: "Not found." }, { status: 404 });
}
```

The `workspaceId` check prevents cross-workspace access. Even if a user knows another workspace's item ID, the `workspaceId` mismatch returns 404.

## How the assistant creates canvas items

The AI assistant (via `src/server/assistant/canvas-tools.ts`) calls `createCanvasItem` with `createdBy: "assistant"`. The assistant tool validates:

1. The board exists and belongs to the workspace.
2. The item type is one of the allowed types.
3. Position (x, y) is within reasonable bounds (not negative, not absurdly large).
4. Content matches the expected schema for that type.

The assistant can also update and delete items, always with `createdBy` markers preserved on update (the original `createdBy` is not changed on updates).

## Canvas item API routes

### `GET /api/canvas-items?boardId=...`

Lists all items on a board. Verifies the board belongs to the workspace.

### `POST /api/canvas-items`

Creates a new item. Accepts type, position, size, content, style, metadata.

### `GET /api/canvas-items/[id]`

Returns a single item by ID. Verifies workspace ownership.

### `PATCH /api/canvas-items/[id]`

Updates an item's position, size, content, style, or metadata.

### `DELETE /api/canvas-items/[id]`

Soft-deletes an item (sets `deletedAt`).

**Next:** [16-tasks-reminders.md](./16-tasks-reminders.md) — the Task and Reminder models, CRUD operations, and the task center.
