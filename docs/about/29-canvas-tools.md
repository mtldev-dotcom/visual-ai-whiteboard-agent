# Canvas Tools Deep Dive

`src/server/assistant/canvas-tools.ts` implements three tools that manage canvas items — the objects that appear on the whiteboard. These are the most frequently called tools in the application.

## Item Type Allowlist

The assistant can only create items of specific types. This is enforced by the `ASSISTANT_CANVAS_ITEM_TYPES` constant:

```typescript
const ASSISTANT_CANVAS_ITEM_TYPES = [
  "text", "sticky_note", "task_list", "kanban",
  "markdown", "image", "link", "html_widget",
];
```

This list is deliberately narrower than the full `VALID_TYPES` in the canvas-items API route. The `notes` type was removed from this list to consolidate note-taking into sticky_notes. Any attempt to create an unlisted type is rejected during validation.

## `add_canvas_item` — Place an Item on the Board

Creates a new structured object on a board canvas, persisted in `CanvasItem`.

**Input:**

| Field | Type | Required | Description |
|---|---|---|---|
| `boardId` | string | Yes | Target board ID |
| `type` | string | Yes | Must be in ASSISTANT_CANVAS_ITEM_TYPES |
| `x`, `y` | number | Yes | Position (finite numbers) |
| `width`, `height` | number | Yes | Size (must be > 0) |
| `content` | object | Yes | Structured content (varies by type) |
| `style` | object | No | Visual overrides |
| `metadata` | object | No | Custom metadata |
| `safetyMetadata` | object | No | Safety/permission info |

**Validation (`validateAddCanvasItemInput`):**

This is the most thorough validation function in the codebase. It checks:

1. Input is an object (not null, not array)
2. `boardId` is a non-empty string
3. `type` is a non-empty string AND in the allowlist
4. `x`, `y`, `width`, `height` are finite numbers
5. `width` and `height` are greater than zero
6. `content` is an object
7. If present, `style`, `metadata`, `safetyMetadata` must be objects

The finite number check uses a helper:

```typescript
function hasNumber(input: Record<string, unknown>, key: string) {
  return typeof input[key] === "number" && Number.isFinite(input[key]);
}
```

This rejects `NaN`, `Infinity`, and `-Infinity` — preventing corrupted position/size data from reaching the database.

**Execution:**

Before writing to DB, the tool verifies board workspace ownership:

```typescript
const board = await getBoardById(input.boardId);
if (!board || board.workspaceId !== context.workspaceId) {
  return { ok: false, summary: "Board not found." };
}
```

Then creates the item with all fields, using empty objects as defaults for style/metadata/safetyMetadata:

```typescript
const item = await createCanvasItem({
  boardId: input.boardId,
  content: input.content,
  createdBy: actorToCreatedBy(context.actor.type),
  height: input.height,
  metadata: input.metadata,
  safetyMetadata: input.safetyMetadata,
  style: input.style,
  type: input.type.trim(),
  width: input.width,
  workspaceId: context.workspaceId,
  x: input.x,
  y: input.y,
});
```

## `update_canvas_item` — Modify an Existing Item

Partially updates an existing canvas item. All fields except `itemId` are optional — only provided fields are changed.

**Input:**

| Field | Type | Required | Description |
|---|---|---|---|
| `itemId` | string | Yes | Target item ID |
| `x`, `y`, `width`, `height` | number | No | New position/size |
| `content` | object | No | New content |
| `style` | object | No | Updated styles |
| `metadata` | object | No | Updated metadata |
| `safetyMetadata` | object | No | Updated safety info |

**Validation (`validateUpdateCanvasItemInput`):**

```
isObject? → itemId is non-empty string? → numeric fields are finite? → width/height > 0? → object fields are objects?
```

**Execution:**

The ownership check verifies the item (not a board this time) belongs to the current workspace:

```typescript
const existing = await getCanvasItemById(input.itemId);
if (!existing || existing.workspaceId !== context.workspaceId) {
  return { ok: false, summary: "Item not found." };
}
```

Then calls `updateCanvasItem` from db helpers with only the provided fields.

## `delete_canvas_item` — Safely Remove an Item

Performs a soft delete — sets `deletedAt` to the current timestamp. Items are never physically removed from the database, enabling undo and audit trails.

**Input:**

| Field | Type | Required | Description |
|---|---|---|---|
| `itemId` | string | Yes | Target item ID |
| `confirmed` | boolean | Must be `true` | Explicit confirmation gate |

**The confirmation requirement is strict:**

```typescript
if (input.confirmed !== true) {
  return { ok: false, error: "confirmed must be true before deleting an item." };
}
```

Note this is `!== true`, not `!input.confirmed`. This means `confirmed: undefined`, `confirmed: null`, and `confirmed: false` are ALL rejected. Only the literal `true` value passes. This prevents accidental deletions where the LLM forgets to set the flag.

**Execution:**

Same ownership check pattern, then soft delete:

```typescript
const item = await softDeleteCanvasItem(input.itemId);
return {
  ok: true,
  output: { itemId: item.id },
  summary: `Deleted ${item.type} item.`,
};
```

## Permission Levels

- `add_canvas_item`: Level 1 (safe visual changes)
- `update_canvas_item`: Level 1 (safe visual changes)
- `delete_canvas_item`: Level 2 (persistent data changes — requires confirmation)

## Registration

```typescript
export function registerCanvasTools(registry: ToolRegistry) {
  registry.register(addCanvasItemTool);
  registry.register(updateCanvasItemTool);
  registry.register(deleteCanvasItemTool);
}
```

## How These Tools Work Together

A typical delete flow chains two tools:

1. User: "Delete the welcome note"
2. LLM calls `list_canvas_items({ boardId })` → gets item IDs and types
3. LLM matches "welcome note" to an item of type `sticky_note`
4. LLM calls `delete_canvas_item({ itemId: "...", confirmed: true })` → soft delete succeeds
5. Chat route runs a final response pass with only grounding data
6. LLM responds: "I deleted the 'Welcome' sticky note."

Without step 2-3, the LLM would have no way to know which item to delete — board queries are required before mutations.

**Key files:** `src/server/assistant/canvas-tools.ts`, `src/server/assistant/canvas-tools.test.ts`, `src/db/canvas-items.ts`
