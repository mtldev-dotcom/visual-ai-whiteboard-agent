# 18 — BoardCanvas Overview

**File:** `src/app/components/BoardCanvas.tsx` (1380 lines)

## Purpose

`BoardCanvas` is the core canvas component that renders structured board data as an interactive, pannable, zoomable workspace. It is a client component (`"use client"`) because it manages pointer events, drag state, and real-time DOM transforms.

## Component Signature

```tsx
type Props = {
  boardId: string | null;
  refreshKey: number;
  onRefreshNeeded: () => void;
};

export function BoardCanvas({ boardId, refreshKey, onRefreshNeeded }: Props)
```

- **`boardId`**: The currently selected board. `null` means no board is selected — the component shows an empty-state prompt.
- **`refreshKey`**: A counter from the parent. When the parent increments it, the canvas re-fetches items from the database. This is the parent-child communication pattern used by `AssistantPanel` (after tool calls) and the board selector to trigger a canvas reload.
- **`onRefreshNeeded`**: Callback to increment `refreshKey` from within the canvas (e.g., after the undo keyboard shortcut falls back to a full refresh).

## Data Loading

On mount and whenever `boardId` or `refreshKey` changes, a `useEffect` fires:

```tsx
useEffect(() => {
  if (!boardId) return;
  const controller = new AbortController();
  async function load() {
    setLoading(true);
    const res = await fetch(`/api/boards/${boardId}`, { signal: controller.signal });
    const data = await res.json();
    setItems(data.canvasItems ?? []);
    setLoading(false);
  }
  void load();
  return () => controller.abort();
}, [boardId, refreshKey]);
```

The fetch targets `GET /api/boards/:boardId`, which returns the board plus its `canvasItems` array. Each item is mapped into a typed `CanvasItem` with `id`, `type`, `x`, `y`, `width`, `height`, and `content`.

**Why AbortController?** Prevents stale-setState-on-unmounted warnings when the user rapidly switches boards or the component unmounts during a fetch.

## Type Definitions

```tsx
type CanvasItemContent = {
  title?: string; text?: string; alt?: string; href?: string;
  html?: string; src?: string;
  tasks?: { completed: boolean; title: string }[];
  columns?: { id: string; title: string; cards: { id: string; title: string }[] }[];
};

type CanvasItem = {
  id: string; type: string; x: number; y: number;
  width: number; height: number; content: CanvasItemContent;
};
```

The `content` field is a flexible object — different item types populate different keys. `tasks` and `columns` are arrays for `task_list` and `kanban` types respectively.

## Viewport Architecture

The canvas uses a **nested div transform pattern**:

```
┌─ .canvas-surface (overflow-hidden, touch-none)
│  ├─ inner div: transform: translate(panX, panY) scale(zoom)
│  │  └─ 3000×3000px workspace div
│  │     └─ absolutely-positioned ItemCards at (left: x, top: y)
```

The outer container (`canvas-surface`) clips to the viewport. The inner div applies the current pan (CSS `translate`) and zoom (CSS `scale`) to move the entire workspace. Inside, a large 3000×3000 div provides ample room for items, which are placed via absolute positioning.

**Why 3000×3000?** It creates a generous but bounded workspace. Items placed near edges won't clip unexpectedly, and the grid texture repeats across the entire surface.

## Grid Background

The canvas background uses a subtle grid texture defined via CSS custom property `--bg-canvas`. This gives users a spatial reference when panning — they can see movement relative to the grid.

## Loading and Empty States

The component handles four visual states:

1. **Loading** — Spinner overlay with "Loading board…" text, using `--bg-canvas` background to match the canvas.
2. **No board selected** — Centered prompt: "No board selected / Choose or create a board to get started."
3. **Empty canvas** — Centered prompt: "Canvas is empty / Ask the AI assistant or pick a tool below to add items."
4. **Active** — Items rendered at their positions.

**Why explicit empty states?** An infinite canvas can feel broken if it's just blank. These prompts guide the user to the next action.

## Mobile Responsiveness

The component includes a mobile bottom sheet (`animate-slide-up`) that appears when an item is selected on small screens (`lg:hidden`). It provides Edit, Copy, Refresh, and Delete actions in a grid layout accessible at the bottom of the screen, avoiding hard-to-reach hover toolbars.

```tsx
{selectedItem && (
  <div className="animate-slide-up absolute inset-x-3 bottom-20 z-20 rounded-2xl border p-3 lg:hidden">
    {/* Mobile action grid */}
  </div>
)}
```

**Why two interaction models?** Desktop users get context toolbars above selected items. Mobile users can't easily reach those — a bottom sheet keeps actions within thumb reach.

## State Breakdown

The component manages these state variables:

| State | Type | Purpose |
|---|---|---|
| `items` | `CanvasItem[]` | Loaded canvas items |
| `loading` | `boolean` | Fetch in progress |
| `pan` | `{x, y}` | Viewport offset |
| `zoom` | `number` | Scale factor (0.3–2.5) |
| `selectedId` | `string \| null` | Currently selected item |
| `activeTool` | `CanvasTool` | Active toolbar tool |
| `editState` | `EditState \| null` | Title/text edit modal state |
| `confirmDelete` | `ConfirmState \| null` | Delete confirmation modal state |
| `undoToast` | `boolean` | Undo notification visibility |
| `dragStart` | object \| null | Canvas pan drag state |
| `itemDrag` | object \| null | Item move/resize drag state |

## Core Design Decisions

1. **Single component file**: All canvas logic — rendering, interaction, persistence, editing — lives in one file. This avoids prop-drilling through 5+ sub-components for shared drag state. The trade-off is a 1380-line file, but the logic is cohesive.

2. **refreshKey pattern**: Instead of exposing an imperative `reload()` function, the parent controls reloads by incrementing a counter. This is a React-idiomatic way to trigger side effects in child components without refs or forwardRef.

3. **Optimistic updates**: When items are moved or resized, the local state updates immediately. Server persistence is debounced (600ms). This means the UI feels instant even on slow connections.

4. **Touch-first**: Uses `pointer-events` (not mouse events), `touch-none`, and `touch-manipulation` CSS classes throughout. This ensures consistent behavior across mouse, touch, and stylus input.

5. **No external state library**: All canvas state is React `useState`/`useRef`. There are no global stores, no context providers, no state management libraries. The canvas is a self-contained interaction surface.
