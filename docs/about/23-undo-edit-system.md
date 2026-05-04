# 23 — Undo, Edit, Copy & Delete System

**File:** `src/app/components/BoardCanvas.tsx`

## Undo Architecture

### UndoSnapshot Type

```tsx
type UndoSnapshot = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};
```

An `UndoSnapshot` captures the full geometry of an item before a move or resize. It does **not** capture content (title/text) because edit-save creates a distinct undo point. The snapshot is position-only — reverting to it restores the item's location and size.

**Why not a full content snapshot?** Content changes happen via the edit modal, which is a deliberate action with a Save button. Position changes happen continuously during drag. The two types of mutations have different undo needs.

### Undo Stack

```tsx
const undoStack = useRef<UndoSnapshot[]>([]);
```

The stack is a `useRef` — mutations to it don't trigger re-renders. This is appropriate because:
1. The stack is read-only from the render perspective (only `undoCanvasChange` reads it).
2. Re-rendering on every push would be wasteful (every drag-end pushes a snapshot).

```tsx
const pushUndoSnapshot = useCallback((snapshot: UndoSnapshot) => {
  undoStack.current = [...undoStack.current, snapshot].slice(-20);
}, []);
```

The stack is capped at **20 entries**. Old entries fall off the front. This prevents unbounded memory growth during long editing sessions.

**Why 20?** It's enough for practical undo chains (user typically undoes 1–5 actions) while keeping memory trivial. 20 snapshots × ~40 bytes each = ~800 bytes total.

### Capturing Snapshots

Snapshots are captured at the start of every item drag:

```tsx
// In PointerDown handler for item move:
before: {
  id: item.id, x: item.x, y: item.y,
  width: item.width, height: item.height,
}
```

And pushed on drag end (if the item actually moved):

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

**Why check if the item actually changed?** If the user clicks an item and immediately releases (no movement), pushing an undo snapshot for a no-op would be confusing. The undo Step 1 would do nothing, and Step 2 would undo the previous real action.

### Executing Undo (Ctrl+Z / Cmd+Z)

```tsx
const undoCanvasChange = useCallback(async () => {
  const snapshot = undoStack.current.pop();
  if (!snapshot) return;

  if (saveTimer.current) clearTimeout(saveTimer.current);

  // 1. Optimistic local state update
  setItems((prev) =>
    prev.map((item) =>
      item.id === snapshot.id
        ? { ...item, x: snapshot.x, y: snapshot.y, width: snapshot.width, height: snapshot.height }
        : item,
    ),
  );

  // 2. Select the reverted item
  setSelectedId(snapshot.id);

  // 3. Show undo toast
  showUndoToast();

  // 4. Persist the rollback
  try {
    await fetch(`/api/canvas-items/${snapshot.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ x: snapshot.x, y: snapshot.y, width: snapshot.width, height: snapshot.height }),
    });
  } catch {
    onRefreshNeeded();
  }
}, [onRefreshNeeded, showUndoToast]);
```

The undo operation has four steps:

1. **Optimistic local update**: The item's geometry is immediately restored in React state. The user sees the undo instantly.
2. **Reselect the item**: The undone item gets focus. This makes it obvious what was undone.
3. **Toast notification**: A floating notification says "Canvas change undone."
4. **Server rollback**: A PATCH sends the old geometry to the server. If this fails, the canvas does a full refresh via `onRefreshNeeded()`.

**Why clear the save timer?** If a debounced PATCH from a recent move is still pending, it would overwrite the undo. Clearing the timer cancels any in-flight saves from the drag that was just undone.

### Keyboard Binding

```tsx
useEffect(() => {
  function handleKeyDown(event: KeyboardEvent) {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target?.isContentEditable) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
      event.preventDefault();
      void undoCanvasChange();
    }
  }
  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, [undoCanvasChange]);
```

**Why `event.preventDefault()`?** Without it, Ctrl+Z would also trigger the browser's native undo (which might affect form inputs elsewhere on the page). Preventing default ensures only the canvas undo runs.

**Why also check `isContentEditable`?** Some items might have editable regions. If the user is editing content inside an item, Ctrl+Z should trigger text undo, not canvas geometry undo.

### Undo Toast

A 3-second notification that appears after undo:

```tsx
const showUndoToast = useCallback(() => {
  setUndoToast(true);
  if (undoToastTimer.current) clearTimeout(undoToastTimer.current);
  undoToastTimer.current = setTimeout(() => setUndoToast(false), 3000);
}, []);

// Rendered as:
{undoToast && (
  <div className="absolute top-3 left-1/2 z-20 -translate-x-1/2 rounded-full border px-3 py-1.5 text-xs font-semibold">
    Canvas change undone
  </div>
)}
```

**Why a toast rather than a persistent notification?** Undo is a transient action — the user either sees it or doesn't. A permanent notification would be clutter. The toast is non-interactive (unlike tools like Figma where the undo toast has an "Undo" button). In this implementation, undo is stack-based — you can't redo from the toast.

### Stack Reset on Board Change

```tsx
useEffect(() => {
  undoStack.current = [];
}, [boardId]);
```

When the user switches boards, the undo stack is cleared. Undo history is per-board-session, not persisted across boards.

**Why not persist undo across boards?** Cross-board undo would be confusing — undoing an action from Board A while viewing Board B would silently change something the user can't see.

## Edit Modal System

### State

```tsx
type EditState = { itemId: string; title: string; text: string } | null;
const [editState, setEditState] = useState<EditState>(null);
```

`EditState` is either null (modal closed) or an object with the item's current title and text. It's populated from `item.content.title` and `item.content.text` when the user clicks Edit.

### Modal UI

```tsx
{editState && (
  <div className="absolute inset-0 z-40 flex items-center justify-center p-4"
       style={{ background: "var(--bg-overlay)" }}
       onClick={() => setEditState(null)}>
    <div className="animate-scale-in w-full max-w-sm rounded-2xl border p-5"
         onClick={(e) => e.stopPropagation()}>
      <h3>Edit item</h3>
      <input autoFocus value={editState.title} onChange={...} placeholder="Title" />
      <textarea value={editState.text} onChange={...} placeholder="Content" rows={4} />
      <div className="flex justify-end gap-2">
        <button onClick={() => setEditState(null)}>Cancel</button>
        <button onClick={saveEdit}>Save</button>
      </div>
    </div>
  </div>
)}
```

Key UX details:
- **Backdrop click dismisses**: `onClick={() => setEditState(null)}` on the overlay.
- **Modal click stops propagation**: Prevents backdrop-click-to-dismiss from firing when clicking inside the modal.
- **`autoFocus`** on the title input: The user can start typing immediately.
- **`animate-scale-in`**: A CSS animation class for a subtle scale-up entrance.

### Save

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

**Why not push an undo snapshot for edit?** The current undo system only handles geometry (position/size). Content edits are not undo-able via Ctrl+Z. This is a known limitation — the undo system was scoped to the most common undo scenario (accidental move/resize).

## Copy

```tsx
async function copyItem(item: CanvasItem) {
  if (!boardId) return;
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
  if (data.item) setItems((prev) => [...prev, data.item]);
}
```

Copy creates a completely new item via POST. The visual offset of (24, 24) makes the duplicate immediately visible. The new item gets a new server-assigned ID.

**Why POST not PUT?** A copy is a new entity. Even though it has identical content, it must have a unique ID, creation timestamp, and independent lifecycle.

## Delete

Delete is a two-step flow:

### Step 1: Confirmation Dialog

```tsx
type ConfirmState = { itemId: string } | null;
const [confirmDelete, setConfirmDelete] = useState<ConfirmState>(null);

// Triggered by:
setConfirmDelete({ itemId: item.id });
```

The confirmation modal renders:
- Title: "Delete this item?"
- Body: "This cannot be undone."
- Buttons: Cancel (dismisses) and Delete (executes the deletion)

### Step 2: Delete Execution

```tsx
async function deleteItem(id: string) {
  await fetch(`/api/canvas-items/${id}`, { method: "DELETE" });
  setItems((prev) => prev.filter((i) => i.id !== id));
  setSelectedId(null);
  setConfirmDelete(null);
}
```

**Why the confirmation gate?** On mobile, the Delete button in the bottom sheet is easy to accidentally tap. On desktop, it's next to the Edit button. The confirmation dialog adds a deliberate pause before the irreversible action.

**Why doesn't the UI use `softDeleteCanvasItem`?** The UI calls the REST API (`DELETE /api/canvas-items/:id`), which internally uses `softDeleteCanvasItem`. The assistant tool `delete_canvas_item` also uses the same DB function. Both paths lead to the same soft-delete, but the UI route doesn't require the `confirmed: true` parameter that the tool does.

## Cleanup

```tsx
useEffect(() => {
  return () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (undoToastTimer.current) clearTimeout(undoToastTimer.current);
  };
}, []);
```

On component unmount, all timers are cleared. This prevents memory leaks — a pending debounced save shouldn't fire after the component is removed from the DOM.
