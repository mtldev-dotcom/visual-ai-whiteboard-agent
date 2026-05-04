# 21 — Selection, Move, Resize

**File:** `src/app/components/BoardCanvas.tsx`

## Item Selection

### Click to Select

Items are wrapped in a `role="button"` div that handles click-to-select:

```tsx
onClick={(e) => {
  e.stopPropagation();
  setSelectedId(item.id);
}}
```

`e.stopPropagation()` is critical — without it, the click would bubble to the canvas surface `onClick` handler, which deselects everything.

### Click-Away to Deselect

The canvas surface `onClick` handler deselects:

```tsx
onClick={(e) => {
  if (isCreateMode) {
    void createItemAtPosition(activeTool, e.clientX, e.clientY);
    setActiveTool("select");
    return;
  }
  setSelectedId(null);
}}
```

**Why deselect on canvas click?** This is standard whiteboard behavior. Clicking empty space means "I'm done with the current item." The exception is when in create mode — in that case, the click creates a new item instead.

### Keyboard Selection

Items support keyboard focus and keyboard-triggered selection:

```tsx
onKeyDown={(e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    setSelectedId(item.id);
  }
  if (e.key === "Delete" || e.key === "Backspace") {
    if (selected) setConfirmDelete({ itemId: item.id });
  }
}}
```

The `tabIndex={0}` attribute makes each item focusable in the tab order. Screen readers can navigate between items, and Delete/Backspace opens the delete confirmation dialog.

## Selection Visuals

When `selectedId === item.id`, the item gets two visual indicators:

### Selection Ring

```tsx
{selected && (
  <div className="pointer-events-none absolute -inset-1 rounded-xl"
       style={{ outline: "2px solid var(--accent)", outlineOffset: "2px" }} />
)}
```

A 2px accent-colored outline offset 2px from the item edge. `pointer-events-none` ensures the outline doesn't interfere with item interaction — clicks pass through to the item beneath.

### Resize Handle

```tsx
<div className="absolute -bottom-2 -right-2 h-5 w-5 cursor-nwse-resize rounded-md border-2"
     style={{ background: "var(--accent)", borderColor: "var(--bg-surface)" }} />
```

A 20×20px square at the bottom-right corner with `cursor-nwse-resize`. The handle has its own pointer event handlers for resize-drag (see below).

### Context Actions Toolbar

A floating toolbar appears above the selected item on desktop:

```tsx
<div className="absolute -top-9 left-0 flex items-center gap-1 rounded-lg border px-1.5 py-1">
  <ActionBtn label="Edit" onClick={...} />
  <ActionBtn label="Copy" onClick={...} />
  <ActionBtn label="Refresh" onClick={onRefreshNeeded} />
  <ActionBtn label="Delete" danger onClick={...} />
</div>
```

This toolbar is positioned `-top-9` (above the item) and has `onClick={(e) => e.stopPropagation()}` and `onPointerDown={(e) => e.stopPropagation()}` to prevent the toolbar buttons from triggering item drag.

On mobile (`lg:hidden`), this toolbar is replaced by a bottom sheet (see Chapter 18).

## Move: Drag Selected Item

Moving an item uses a drag state machine parallel to pan-drag:

```tsx
const [itemDrag, setItemDrag] = useState<{
  mode: "move" | "resize";
  pointerId: number; itemId: string;
  x: number; y: number;               // pointer start position (screen)
  itemX: number; itemY: number;       // item start position (canvas)
  itemWidth: number; itemHeight: number;
  before: UndoSnapshot;               // pre-drag snapshot for undo
} | null>(null);
```

**PointerDown on item** (lines 979–1001):

```tsx
onPointerDown={(e) => {
  e.stopPropagation();
  e.currentTarget.setPointerCapture(e.pointerId);
  setSelectedId(item.id);
  setItemDrag({
    mode: "move",
    pointerId: e.pointerId, x: e.clientX, y: e.clientY,
    itemX: item.x, itemY: item.y,
    itemWidth: item.width, itemHeight: item.height,
    before: { id: item.id, x: item.x, y: item.y, width: item.width, height: item.height },
  });
}}
```

**Why capture the full `before` snapshot at pointer-down?** This gives the undo system an exact record of the item's state before any modification. If the user presses Ctrl+Z mid-drag, the item returns to its pre-drag position.

**PointerMove on item** (lines 1002–1005):

```tsx
onPointerMove={(e) => {
  if (itemDrag?.pointerId === e.pointerId)
    updateDragged(e.clientX, e.clientY);
}}
```

The `updateDragged` function (see below) applies the delta to the item position.

**PointerUp on item** (lines 1006–1009):

```tsx
onPointerUp={(e) => {
  e.currentTarget.releasePointerCapture(e.pointerId);
  finishItemDrag(e.pointerId);
}}
```

## Position Update with Zoom Compensation

```tsx
function updateDragged(clientX: number, clientY: number) {
  if (!itemDrag) return;
  const dx = (clientX - itemDrag.x) / zoom;
  const dy = (clientY - itemDrag.y) / zoom;
  setItems((prev) =>
    prev.map((item) => {
      if (item.id !== itemDrag.itemId) return item;
      if (itemDrag.mode === "resize") {
        const w = Math.max(160, itemDrag.itemWidth + dx);
        const h = Math.max(96, itemDrag.itemHeight + dy);
        persistSize(item.id, w, h);
        return { ...item, width: w, height: h };
      }
      const nx = itemDrag.itemX + dx;
      const ny = itemDrag.itemY + dy;
      persistPosition(item.id, nx, ny);
      return { ...item, x: nx, y: ny };
    }),
  );
}
```

**Why divide by zoom?** The pointer delta is in screen pixels. At 2× zoom, moving the pointer 100px on screen should move the item 50px in canvas space. Dividing by `zoom` performs this conversion.

For **move mode**: `newX = itemStartX + (screenDeltaX / zoom)`. The item's position is absolute canvas coordinates, so this is straightforward.

For **resize mode**: `newWidth = max(160, startWidth + screenDeltaX / zoom)`. The minimum width of 160px and minimum height of 96px prevent items from being resized to invisible dimensions.

## Debounced Persistence

```tsx
const DEBOUNCE_MS = 600;

const persistPosition = useCallback((id: string, x: number, y: number) => {
  if (saveTimer.current) clearTimeout(saveTimer.current);
  saveTimer.current = setTimeout(() => {
    fetch(`/api/canvas-items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ x, y }),
    }).catch(() => null);
  }, DEBOUNCE_MS);
}, []);
```

**Why 600ms?** On every pointer-move (60fps = 16ms between frames), the debounce timer resets. Only when the user stops moving for 600ms does a PATCH fire. This prevents flooding the server with hundreds of intermediate positions.

**Why `catch(() => null)`?** If the server is unreachable, we don't want an unhandled promise rejection crashing the UI. The optimistic local state is already correct — the server sync is best-effort.

`persistSize` follows the same pattern but sends `{ width, height }` instead.

## Resize

The resize handle at the bottom-right corner has its own pointer event handlers:

```tsx
<div className="absolute -bottom-2 -right-2 h-5 w-5 cursor-nwse-resize rounded-md border-2"
     onPointerDown={(e) => {
       e.stopPropagation();
       e.currentTarget.setPointerCapture(e.pointerId);
       setItemDrag({ mode: "resize", ... });
     }}
     onPointerMove={(e) => {
       if (itemDrag?.pointerId === e.pointerId)
         updateDragged(e.clientX, e.clientY);
     }}
     onPointerUp={(e) => {
       e.currentTarget.releasePointerCapture(e.pointerId);
       finishItemDrag(e.pointerId);
     }} />
```

The `mode: "resize"` flag tells `updateDragged` to adjust `width` and `height` instead of `x` and `y`. The minimum size enforcement (`Math.max(160, ...)`, `Math.max(96, ...)`) prevents the item from collapsing to zero.

## Undo Snapshot on Drag End

```tsx
const finishItemDrag = useCallback((pointerId: number) => {
  if (!itemDrag || itemDrag.pointerId !== pointerId) return;
  const item = items.find((c) => c.id === itemDrag.itemId);
  if (item && (
    item.x !== itemDrag.before.x || item.y !== itemDrag.before.y ||
    item.width !== itemDrag.before.width || item.height !== itemDrag.before.height
  )) {
    pushUndoSnapshot(itemDrag.before);
  }
  setItemDrag(null);
}, [itemDrag, items, pushUndoSnapshot]);
```

The snapshot is only pushed if the item actually changed position or size. If the user clicked an item but didn't move it, no undo entry is created. The undo stack is capped at 20 entries (see Chapter 23).

## Edit Modal

When the user clicks "Edit" (either from the context toolbar or the item's built-in Edit button):

```tsx
setEditState({
  itemId: item.id,
  title: item.content.title ?? "",
  text: item.content.text ?? "",
});
```

This opens a centered modal with:
- A title `<input>` (autofocus)
- A content `<textarea>` (4 rows, resizable)
- Cancel and Save buttons

On save, a PATCH is sent to `/api/canvas-items/:id` with `{ content: { title, text } }`, and local state is updated optimistically:

```tsx
async function saveEdit() {
  if (!editState) return;
  await fetch(`/api/canvas-items/${editState.itemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: { title: editState.title, text: editState.text } }),
  });
  setItems((prev) =>
    prev.map((i) =>
      i.id === editState.itemId
        ? { ...i, content: { ...i.content, title: editState.title, text: editState.text } }
        : i,
    ),
  );
  setEditState(null);
}
```

**Why not debounce the edit save?** Edits are explicit — the user clicks Save. There's no stream of intermediate values to debounce.

## Item Copy

```tsx
async function copyItem(item: CanvasItem) {
  const res = await fetch("/api/canvas-items", {
    method: "POST",
    body: JSON.stringify({
      boardId, type: item.type,
      x: item.x + 24, y: item.y + 24,
      width: item.width, height: item.height,
      content: item.content,
    }),
  });
  const data = await res.json();
  setItems((prev) => [...prev, data.item]);
}
```

The copy is offset by `(24, 24)` so the user can see it's a duplicate immediately. This is a common whiteboard pattern — the offset makes the copy visually distinct.

## Item Delete

Delete requires a confirmation dialog:

```tsx
// Step 1: User clicks Delete → show confirmation
setConfirmDelete({ itemId: item.id });

// Step 2: User confirms → send DELETE
async function deleteItem(id: string) {
  await fetch(`/api/canvas-items/${id}`, { method: "DELETE" });
  setItems((prev) => prev.filter((i) => i.id !== id));
  setSelectedId(null);
  setConfirmDelete(null);
}
```

The confirmation dialog says "Delete this item? / This cannot be undone." Cancel dismisses the dialog. The confirmation gate prevents accidental deletions from misclicks.

**Why the assistant tool requires `confirmed: true` but the UI doesn't pass that?** The UI uses `DELETE` directly (a RESTful route), not the assistant tool. The `confirmed: true` constraint only applies to LLM-initiated deletions to prevent the model from accidentally deleting items.
