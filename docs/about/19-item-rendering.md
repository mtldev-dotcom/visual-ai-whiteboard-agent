# 19 — Item Rendering: The ItemCard Component

**File:** `src/app/components/BoardCanvas.tsx` (lines 53–459)

## Overview

`ItemCard` is a function inside `BoardCanvas.tsx` that renders a single canvas item based on its `type`. It is not exported — it exists only within the `BoardCanvas` module because it shares no state with the outside world, only receiving `item` and `onEdit` as props.

```tsx
function ItemCard({ item, onEdit }: { item: CanvasItem; onEdit: () => void })
```

Every item renderer uses a shared base style:

```tsx
const base = "absolute inset-0 overflow-hidden rounded-xl border text-sm transition-shadow";
```

**Why `overflow-hidden`?** Items have a fixed size set by `width`/`height` in the parent positioning div. Content that exceeds that size must be clipped rather than breaking the layout.

## Type-by-Type Rendering

### `sticky_note` (lines 57–89)

```tsx
background: "#fef9c3", borderColor: "#fde047"
```

A yellow card with a darker yellow title bar (`#fef08a`). The title bar shows the `content.title` and an Edit button. Body shows `content.text` in `whitespace-pre-line` (preserves intentional line breaks).

**Why hardcoded colors?** Sticky notes have a well-established visual convention (yellow = note). Hardcoding the yellow scheme makes them instantly recognizable, while the text card uses theme variables for neutral content.

### `text` (lines 92–132)

A neutral card using theme variables (`--bg-surface`, `--border`). Title bar with title text and Edit button. Body renders `content.text`.

### `markdown` (lines 134–158)

A card with a 3px left accent border (`borderLeftWidth: "3px"`, `borderColor: "var(--accent)"`). Shows a "MARKDOWN" label in uppercase tracking-widest text, then the raw markdown text in a `<pre>` element with monospace font.

**Why `pre` instead of rendered markdown?** The canvas renders raw text — markdown rendering happens in downstream consumers. Showing raw text in a `pre` block communicates "this is source text" to the user.

### `task_list` (lines 221–295)

A card with a progress counter (`done/total`). Each task is a list item with a custom checkbox (SVG checkmark in a styled square). Completed tasks get `line-through` text decoration and muted color.

```tsx
const done = tasks.filter((t) => t.completed).length;
// Rendered as: "done/total" badge
```

Checkboxes are **read-only**. The canvas currently doesn't support inline task toggling — that would require edit-state tracking per checkbox.

### `kanban` (lines 297–377)

A multi-column layout rendered inside a card. Each column is a 128px-wide scrollable sub-container with:
- Column title in uppercase tracking-widest text
- Card count label
- Individual cards rendered as small bordered rectangles
- "Empty" placeholder when a column has no cards

```tsx
const columns = (item.content.columns ?? []) as KanbanColumn[];
// Columns rendered in a horizontal flex with overflow-x-auto
```

**Why 128px columns?** Kanban columns need to be narrow enough to fit multiple columns within a single canvas item, but wide enough to show card titles. The width was chosen to allow 3–4 columns in a 480px-wide item.

### `image` (lines 161–186)

Uses Next.js `Image` component with `object-contain` for aspect ratio preservation. Shows a thumbnail placeholder (`/globe.svg` fallback) and title below.

```tsx
<Image alt={item.content.alt ?? ""} src={item.content.src ?? "/globe.svg"}
       width={200} height={64} />
```

### `link` (lines 188–218)

A blue-top-bordered card (`borderTopWidth: "3px"`, `borderColor: "#93c5fd"`). Shows title, description text, and a clickable `<a>` tag with the `href` colored blue (`#3b82f6`).

**Why a visible `<a>` tag?** Users need to see the actual URL to trust it before clicking. The anchor element opens in the current tab by default (no `target="_blank"`).

### `html_widget` (lines 414–430)

Delegates entirely to `SandboxedHtmlWidget`:

```tsx
<SandboxedHtmlWidget html={item.content.html ?? ""} title={item.content.title ?? "Widget"} />
```

The `html_widget` renderer is intentionally thin — all security and sandboxing logic lives in `SandboxedHtmlWidget`.

### `notes` (lines 379–412)

An orange-tinted card (`#fffbf0` background, `#fed7aa` border) for rich-text notes. Similar to sticky_note but with a warmer color palette, indicating a different semantic purpose (structured notes vs. quick sticky notes).

### Default / `custom_html` (lines 432–458)

For unrecognized types, renders a generic card with a title bar showing the type name and body text. This is a fallback — it ensures new item types added in the future still render something meaningful before a dedicated renderer is built.

## Positioning in the Viewport

Each `ItemCard` is wrapped in a positioning div:

```tsx
<div
  className="absolute touch-manipulation text-left outline-none"
  style={{ left: item.x, top: item.y, width: item.width, height: item.height, zIndex: selected ? 2 : 1 }}
  role="button"
  tabIndex={0}
>
  <ItemCard item={item} onEdit={...} />
</div>
```

The outer div handles:
- **Absolute positioning** within the 3000×3000 workspace
- **Interaction**: click-to-select, pointer-down for drag, keyboard focus
- **Z-index layering**: selected items render above unselected ones
- **Touch manipulation**: `touch-manipulation` disables double-tap zoom on the item

**Why `role="button"` and `tabIndex={0}`?** Items are interactive (click to select, keyboard to edit/delete). These ARIA attributes make them navigable via keyboard for accessibility.

## Edit Callback Pattern

Every interactive item type includes an Edit button that calls `onEdit()`. The callback is wired in `BoardCanvas` to open the edit modal:

```tsx
onEdit={() => setEditState({
  itemId: item.id,
  title: item.content.title ?? "",
  text: item.content.text ?? "",
})}
```

This keeps `ItemCard` a pure renderer — it delegates interaction intent upward via callbacks rather than managing its own edit state.

## Design Principles

1. **Content-type polymorphism**: The item type string drives which renderer runs. Adding a new type means adding a new `if` branch in `ItemCard` — no factory pattern, no registry.

2. **Presentational, not stateful**: `ItemCard` has zero internal state. It receives data and callbacks, renders JSX, and returns. All state lives in `BoardCanvas`.

3. **No media queries inside items**: Item sizing is controlled by the parent's `width`/`height` props. Items scale naturally when the container is zoomed. There's no need for responsive breakpoints inside item renderers because the zoom transform handles visual scaling.

4. **Structured content over freeform HTML**: All content is typed — `title`, `text`, `tasks`, `columns`. No item stores raw HTML that gets dangerously inserted. Even `html_widget` goes through the sandbox.
