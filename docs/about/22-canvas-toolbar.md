# 22 — Canvas Toolbar

**File:** `src/app/components/CanvasToolbar.tsx` (196 lines)

## Overview

`CanvasToolbar` is a floating toolbar at the bottom-center of the canvas. It provides tool selection, zoom controls, and keyboard shortcuts for interacting with the canvas.

```tsx
type Props = {
  activeTool: CanvasTool;
  zoom: number;
  onToolChange: (tool: CanvasTool) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
};

export function CanvasToolbar({ activeTool, zoom, onToolChange, onZoomIn, onZoomOut }: Props)
```

The toolbar is a controlled component — it receives `activeTool` and `zoom` as props and communicates changes upward through callbacks. It stores no internal state.

## Tool Types

```tsx
export type CanvasTool =
  | "select" | "hand" | "text" | "sticky_note" | "task_list" | "widget";
```

Tools are grouped into two categories: **navigation tools** and **creation tools**.

### Navigation Tools

```tsx
const NAV_TOOLS = [
  { id: "select", Icon: MousePointer2, label: "Select  V" },
  { id: "hand",   Icon: Hand,         label: "Pan  H" },
];
```

| Tool | Key | Icon | Behavior |
|---|---|---|---|
| `select` | V | MousePointer2 | Click items to select, drag items to move, click canvas to deselect |
| `hand` | H | Hand | Drag canvas to pan (regardless of Ctrl) |

**Why separate select and hand modes?** In select mode, dragging on an item moves it; dragging on the canvas does nothing. In hand mode, any drag pans the canvas. This prevents accidental item moves when the user intends to pan. Figma uses the same two-tool pattern.

### Creation Tools

```tsx
const CREATE_TOOLS = [
  { id: "text",        Icon: Type,        label: "Text  T" },
  { id: "sticky_note", Icon: StickyNote,  label: "Sticky  S" },
  { id: "task_list",   Icon: CheckSquare, label: "Task list  K" },
  { id: "widget",      Icon: LayoutGrid,  label: "Widget  W" },
];
```

| Tool | Key | Icon | Creates |
|---|---|---|---|
| `text` | T | Type | Text card (220×140, "New text") |
| `sticky_note` | S | StickyNote | Sticky note (200×180, "Note") |
| `task_list` | K | CheckSquare | Task list (260×200, "Tasks" with no tasks) |
| `widget` | W | LayoutGrid | HTML widget placeholder |

**Why is `widget` in CREATE_TOOLS but treated separately?** In `BoardCanvas`, `isCreateMode` excludes `widget`:

```tsx
const isCreateMode = activeTool !== "select" && activeTool !== "hand" && activeTool !== "widget";
```

This is because clicking to create a widget requires more information (HTML source) than a simple click-to-place. The widget tool serves as a future hook point for widget creation workflows.

## Keyboard Shortcuts

A single `useEffect` registers a `keydown` listener:

```tsx
useEffect(() => {
  function onKey(e: KeyboardEvent) {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    switch (e.key.toLowerCase()) {
      case "v": onToolChange("select"); break;
      case "h": onToolChange("hand"); break;
      case "t": onToolChange("text"); break;
      case "s": onToolChange("sticky_note"); break;
      case "k": onToolChange("task_list"); break;
      case "w": onToolChange("widget"); break;
      case "+": case "=": onZoomIn(); break;
      case "-": onZoomOut(); break;
    }
  }
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}, [onToolChange, onZoomIn, onZoomOut]);
```

**Why check for input/textarea targets?** When the user is typing in the edit modal, keyboard shortcuts should NOT fire. Without this guard, pressing "s" while editing a sticky note title would switch to the sticky_note tool.

**Why not require Ctrl prefix?** Single-key shortcuts work well for tools because the canvas doesn't have a text cursor. The tools are mode-switchers, not modifiers — pressing V to select is like pressing V in Figma.

**Why `case "+"`: `case "="` both for zoom in?** On many keyboard layouts, `+` is `Shift+=`. The `=` key (without shift) is also bound to zoom in for convenience.

## Click-to-Create Flow

When a creation tool is active and the user clicks the canvas:

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

The `createItemAtPosition` function in `BoardCanvas`:

```tsx
async function createItemAtPosition(type: string, clientX: number, clientY: number) {
  if (!boardId || !canvasRef.current) return;
  const rect = canvasRef.current.getBoundingClientRect();
  const x = Math.round((clientX - rect.left - pan.x) / zoom);
  const y = Math.round((clientY - rect.top - pan.y) / zoom);
  const defaults = NEW_ITEM_DEFAULTS[type] ?? { width: 220, height: 140, content: { title: "New item" } };
  const res = await fetch("/api/canvas-items", {
    method: "POST",
    body: JSON.stringify({
      boardId, type,
      x: x - defaults.width / 2,
      y: y - defaults.height / 2,
      width: defaults.width, height: defaults.height,
      content: defaults.content,
    }),
  });
  const data = await res.json();
  if (data.item) {
    setItems((prev) => [...prev, data.item]);
    setSelectedId(data.item.id);
  }
}
```

**Coordinate conversion**: `(clientX - rect.left - pan.x) / zoom` converts screen coordinates to canvas coordinates, accounting for the element offset and current pan/zoom transform.

**Centering**: `x - defaults.width / 2` centers the item on the click point. The user clicks where they want the center to be.

**Auto-select mode**: After creating an item, the tool switches back to `select` mode. This prevents accidental duplicate items from subsequent clicks.

## Default Item Sizes

```tsx
const NEW_ITEM_DEFAULTS: Record<string, { width: number; height: number; content: CanvasItemContent }> = {
  text:        { width: 220, height: 140, content: { title: "New text", text: "" } },
  sticky_note: { width: 200, height: 180, content: { title: "Note", text: "" } },
  task_list:   { width: 260, height: 200, content: { title: "Tasks", tasks: [] } },
  kanban:      { width: 480, height: 300, content: { title: "Kanban", columns: [
    { id: "todo", title: "To Do", cards: [] },
    { id: "doing", title: "In Progress", cards: [] },
    { id: "done", title: "Done", cards: [] },
  ]}},
};
```

**Why these dimensions?**
- Text notes are narrow (220px) — they're meant for short content.
- Sticky notes are slightly taller (180px) — they have a title bar + text body.
- Task lists are wider (260px) — task titles need horizontal space.
- Kanban boards are much wider (480px) — to fit 3 columns.

## Visual Design

The toolbar is a floating pill at the bottom-center of the canvas:

```tsx
<div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center">
  <div className="pointer-events-auto flex items-center gap-0.5 rounded-xl border p-1.5">
    {/* Tool buttons */}
  </div>
</div>
```

**Why `pointer-events-none` on the outer div?** Ensures clicks on the empty space between the toolbar and screen edges don't block canvas interaction. Only the toolbar itself (`pointer-events-auto`) receives clicks.

Each tool button is rendered via a `ToolBtn` helper:

```tsx
function ToolBtn({ children, active, label, onClick }) {
  return (
    <button
      aria-label={label}
      className="relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
      style={active
        ? { background: "var(--accent-light)", color: "var(--accent)" }
        : { color: "var(--text-2)" }
      }
      title={label}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--accent-light)"; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = ""; }}
    >
      {children}
    </button>
  );
}
```

Active state: accent background + accent icon color. Inactive state: subtle text color with accent highlight on hover.

Tool groups are separated by a `Divider` component (a 1px vertical line using `var(--border)` color).

## Zoom Display and Controls

The zoom section shows:
- **Zoom out** button (minus icon)
- **Zoom percentage** (`Math.round(zoom * 100)%`) displayed with `tabular-nums` for stable width
- **Zoom in** button (plus icon)

```tsx
<span className="min-w-[46px] select-none text-center text-xs font-semibold tabular-nums">
  {Math.round(zoom * 100)}%
</span>
```

`tabular-nums` ensures proportional digits occupy the same width, preventing the toolbar from shifting when the percentage changes from "100%" to "90%". `select-none` prevents accidental text selection when clicking the zoom buttons rapidly.
