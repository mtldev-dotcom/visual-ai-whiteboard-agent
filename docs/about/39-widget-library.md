# 39: Widget Library UI

**Source:** `src/app/components/WidgetLibrary.tsx` (337 lines)

## Why This Component Exists

Users need a way to discover and add widgets to their boards. The Widget Library is the sidebar panel that shows available prebuilt widgets, lets users preview them, and adds them to the active board with one click.

It lives in the BoardExplorer sidebar — always visible, never requiring a separate menu or dialog to access.

## Component Architecture

```typescript
"use client";

type Props = {
  activeBoardId: string | null;
  onItemAdded?: () => void;
};

export function WidgetLibrary({ activeBoardId, onItemAdded }: Props) {
  // ...
}
```

It's a client component because it manages UI state (preview modal open/close, adding spinner state) and handles user clicks. The `activeBoardId` prop determines whether widgets can be added (must have a selected board). `onItemAdded` is a callback that the parent (BoardExplorer) uses to refresh the canvas items list.

## The Widget Registry

Widgets are defined locally in the component, not fetched from an API:

```typescript
const widgets = [
  {
    category: "Productivity",
    description: "Checklist for board-level tasks",
    name: "Task List",
    icon: CheckSquare,
    type: "task_list",
    defaultContent: { title: "Tasks", tasks: [] },
    defaultWidth: 280,
    defaultHeight: 200,
  },
  {
    category: "Productivity",
    description: "Visual columns for workflow stages",
    name: "Kanban",
    icon: Columns3,
    type: "kanban",
    defaultContent: {
      title: "Kanban",
      columns: [
        { id: "todo", title: "To Do", cards: [] },
        { id: "doing", title: "In Progress", cards: [] },
        { id: "done", title: "Done", cards: [] },
      ],
    },
    defaultWidth: 480,
    defaultHeight: 300,
  },
];
```

### Why Local, Not API-Driven

At this stage, there are only 2 prebuilt widgets. An API call to fetch widget definitions would add latency for no benefit. When the widget system grows (10+ widgets with dynamic definitions), this will migrate to fetching from `GET /api/widget-definitions` with the `kind: "native"` filter.

### Widget Shape

| Field | Purpose |
|---|---|
| `category` | Groups widgets in the library grid |
| `description` | User-facing explanation text |
| `name` | Display name in the card |
| `icon` | Lucide React icon component |
| `type` | String value sent to the CanvasItem API as the `type` field |
| `defaultContent` | Initial content payload for the canvas item |
| `defaultWidth` | Initial width in pixels (mobile-friendly sizes) |
| `defaultHeight` | Initial height in pixels |

### Default Sizes Are Mobile-Conscious

- Task List: 280x200 — fits in half a phone screen.
- Kanban: 480x300 — wider because Kanban columns need horizontal space, but still fits within a tablet viewport.

These aren't hard limits — users can resize widgets after placement. They're just the initial dimensions.

## Adding Widgets: The API Call

```typescript
async function addWidget(widget: (typeof widgets)[number]) {
  if (!activeBoardId) return;
  setAdding(widget.type);
  try {
    await fetch("/api/canvas-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        boardId: activeBoardId,
        type: widget.type,
        x: 40 + Math.random() * 80,
        y: 40 + Math.random() * 80,
        width: widget.defaultWidth,
        height: widget.defaultHeight,
        content: widget.defaultContent,
      }),
    });
    onItemAdded?.();
    setPreviewWidget(null);
  } finally {
    setAdding(null);
  }
}
```

### What Happens When User Clicks "Add to Board"

1. **Guard:** If no board is selected (`activeBoardId` is null), return immediately.
2. **Loading state:** `setAdding(widget.type)` sets a per-widget loading flag. The button shows a spinner and is disabled.
3. **POST /api/canvas-items:** Creates a new CanvasItem row in the database.
4. **Random position:** `x: 40 + Math.random() * 80, y: 40 + Math.random() * 80` gives a slight offset so multiple widgets don't stack exactly on top of each other.
5. **Callback:** `onItemAdded?.()` tells the parent BoardExplorer to refresh its canvas items list.
6. **Close preview:** `setPreviewWidget(null)` dismisses the preview modal.
7. **Cleanup:** `setAdding(null)` in the `finally` block resets loading state even on error.

### Error Handling

There's no explicit error handling. If the fetch fails:
- The loading spinner stops (via `finally`).
- The preview modal closes.
- The widget doesn't appear on the board (no canvas item was created).
- The user can try again.

This is minimal but functional for MVP. Production should show a toast: "Failed to add widget. Try again."

## The Widget Grid

```tsx
<div className="grid grid-cols-2 gap-2">
  {widgets.map((widget) => {
    const Icon = widget.icon;
    const isAdding = adding === widget.type;
    return (
      <button
        disabled={!activeBoardId || isAdding}
        key={widget.name}
        onClick={() => setPreviewWidget(widget)}
        type="button"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-lg">
          {isAdding ? <Spinner /> : <Icon size={14} />}
        </div>
        <span className="font-semibold">{widget.name}</span>
        <span>{widget.description}</span>
      </button>
    );
  })}

  <button disabled type="button">
    <Plus size={16} />
    <span>More soon</span>
  </button>
</div>
```

### Grid Layout Details

- `grid-cols-2` — Two widgets per row. At 2 widgets total, this fills one row perfectly.
- Each widget card is a `<button>` — full card is clickable, not just a small "Add" button.
- **No board state:** If `activeBoardId` is null, all cards are disabled with a "Select a board to add widgets" message above.
- **Adding state:** When a widget is being added, only that widget's card shows a spinner and is disabled.
- **"More soon" placeholder:** A disabled dashed-border card acts as a teaser for future widgets. It's always disabled, always last in the grid.
- **Hover effects:** `onMouseEnter`/`onMouseLeave` change the border color to accent when `activeBoardId` is set.

## The Preview Modal

When a user clicks a widget card (not the "More soon" placeholder), a preview modal opens:

```tsx
{previewWidget && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4"
    onClick={() => setPreviewWidget(null)}   // Close on backdrop click
  >
    <div
      onClick={(event) => event.stopPropagation()}  // Don't close on modal click
    >
      <h3>{previewWidget.name}</h3>
      <p>{previewWidget.description}</p>
      <WidgetPreview widget={previewWidget} />
      <button onClick={() => setPreviewWidget(null)}>Cancel</button>
      <button onClick={() => addWidget(previewWidget)}>
        {adding ? "Adding..." : "Add to board"}
      </button>
    </div>
  </div>
))
```

### Modal Behavior

- **Backdrop click closes** — The outer `div` has `onClick={() => setPreviewWidget(null)}`.
- **Modal click doesn't close** — The inner `div` has `event.stopPropagation()`.
- **Z-index: 50** — Above the canvas and sidebar.
- **Full viewport centering** — `fixed inset-0 flex items-center justify-center`.
- **Mobile padding** — `p-4` gives breathing room on phone edges.

## WidgetPreview Sub-Component

```typescript
function WidgetPreview({ widget }: { widget: (typeof widgets)[number] }) {
  if (widget.type === "task_list") { /* render task list preview */ }
  if (widget.type === "kanban") { /* render kanban preview */ }
  return (/* generic fallback */);
}
```

The `WidgetPreview` function renders a static visual preview of what the widget looks like:

### Task List Preview
```
┌──────────────────────────┐
│ Tasks              0/3   │
│ ☐ Capture ideas          │
│ ☐ Prioritize next step   │
│ ☐ Review board           │
└──────────────────────────┘
```

Shows 3 sample tasks with empty checkboxes and a 0/3 counter. Not functional — just a visual representation.

### Kanban Preview
```
┌──────────────────────────────────────┐
│          │              │             │
│  TO DO   │  IN PROGRESS │    DONE     │
│ ┌──────┐ │  ┌────────┐  │             │
│ │Sample│  │  │ Sample │  │  (empty)    │
│ │card  │  │  │ card   │  │             │
│ └──────┘ │  └────────┘  │             │
└──────────────────────────────────────┘
```

Shows 3 columns (To Do, In Progress, Done) with sample cards in the first two. The Done column is empty. This gives users a realistic sense of what a Kanban board looks like.

### Fallback Preview

If a widget type isn't recognized, renders 3 gray placeholder bars (simulating text lines). This handles future widget types gracefully — they won't crash, they'll just show a generic "skeleton" preview.

## Integration with BoardExplorer

The WidgetLibrary is rendered inside the BoardExplorer sidebar, below the boards list and above the canvas items list. The typical sidebar layout is:

```
BoardExplorer
  ├── Header (BoardExplorer / <board name>)
  ├── Board list (click to switch boards)
  ├── WidgetLibrary    ← This component
  │     ├── "Widgets" section header
  │     ├── Widget cards grid
  │     └── Preview modal (conditionally rendered)
  └── Canvas items list
```

The `activeBoardId` comes from the BoardExplorer's currently selected board state. `onItemAdded` triggers a re-fetch of canvas items in the parent.

## Design Decisions

**Why a modal instead of inline add?**
- Widgets need a visual preview before committing (especially Kanban with its complex layout).
- Inline add would require an extra confirmation step or immediate placement.
- The modal gives users a deliberate "review then act" flow, matching the "keep user in control" rule from CORE.md.

**Why random positioning?**
- Deterministic positioning (always at 0,0) would stack widgets on top of each other.
- The slight random offset (40-120px) gives visual variety without being chaotic.
- Users can drag to reposition after placement.

**Why a local widget array?**
- 2 widgets don't justify an API, a database table, or server-side rendering.
- The array is a staging area — it proves the UI pattern works before the widget definition table is populated.
- Migration path: replace the local array with a `fetch()` call, keep the same component interface.

**Why separate WidgetPreview function?**
- Each widget type has dramatically different preview content.
- A single component with a switch statement keeps type-checking simple.
- When widget definitions come from the API, the preview can render from a JSON template instead of hardcoded components.
