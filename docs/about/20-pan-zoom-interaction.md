# 20 — Pan & Zoom Interaction

**File:** `src/app/components/BoardCanvas.tsx`

## Zoom Constants

```tsx
const zoomStep = 0.1;
const minZoom = 0.3;
const maxZoom = 2.5;

function clampZoom(v: number) {
  return Math.min(maxZoom, Math.max(minZoom, v));
}
```

- **`zoomStep = 0.1`**: Each click of the zoom in/out buttons changes zoom by 10%. This is small enough for fine control but large enough to feel responsive.
- **`minZoom = 0.3`**: At minimum zoom, the canvas is shrunk to 30% — enough to see the full 3000×3000 workspace on most screens.
- **`maxZoom = 2.5`**: At maximum zoom, users can zoom into details at 2.5× scale. Beyond this, items become pixelated and interaction precision drops.
- **`clampZoom`**: Ensures zoom never leaves [0.3, 2.5]. Called by both the scroll wheel handler and the toolbar zoom buttons.

## Zoom: Ctrl+Scroll Wheel

```tsx
onWheel={(e) => {
  e.preventDefault();
  if (e.ctrlKey || e.metaKey) {
    setZoom((z) => clampZoom(z - e.deltaY * 0.01));
  } else {
    setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
  }
}}
```

The `onWheel` handler has two modes:

1. **Ctrl+Scroll (Cmd on Mac)**: Zooms by `deltaY * 0.01` per wheel tick. The multiplier intentionally slows down the zoom to give smooth, precise control. Without the `0.01` factor, a single scroll tick would be too aggressive.

2. **Plain scroll**: Pans by `deltaX`/`deltaY`. This replicates Figma/Miro behavior — scroll to pan horizontally, shift+scroll to pan vertically.

**Why `e.preventDefault()`?** Without it, the browser would also scroll the page. The canvas captures all wheel events within its bounds.

## Pan: Drag on Empty Canvas

Pan is implemented with a drag-start state machine:

```tsx
const [dragStart, setDragStart] = useState<{
  pointerId: number; x: number; y: number;
  panX: number; panY: number; moved: boolean;
} | null>(null);
```

**PointerDown**: Captures the starting pointer position and current pan offset.

```tsx
onPointerDown={(e) => {
  if (isCreateMode) return;
  e.currentTarget.setPointerCapture(e.pointerId);
  setDragStart({
    pointerId: e.pointerId, x: e.clientX, y: e.clientY,
    panX: pan.x, panY: pan.y, moved: false,
  });
}}
```

- `setPointerCapture` ensures the element continues receiving pointer events even if the pointer moves outside the canvas bounds. Without this, fast drags would "lose" the pointer.
- `isCreateMode` bypass: when a creation tool is active, pointer-down creates an item instead of starting a pan.

**PointerMove**: Calculates delta from start and updates pan.

```tsx
onPointerMove={(e) => {
  if (!dragStart || dragStart.pointerId !== e.pointerId) return;
  setPan({
    x: dragStart.panX + e.clientX - dragStart.x,
    y: dragStart.panY + e.clientY - dragStart.y,
  });
}}
```

The pan calculation is absolute (relative to drag-start origin) rather than incremental (delta from previous move). This prevents error accumulation on rapid moves.

**PointerUp**: Releases capture and clears state. The `moved` flag in `dragStart` is never read — it's maintained for future use (e.g., distinguishing click from drag).

## Transform Application

The pan+zoom state is applied via CSS `transform`:

```tsx
<div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
```

**Key detail**: `scale` is on the **outer** transform div (applied to the div that receives `translate`). This means zoom scales both the content AND the pan offset, keeping the focal point stable. This is the standard approach used by Figma, Miro, and Google Maps.

**Why not `transform-origin: top-left`?** The default `transform-origin` is `50% 50%` (center). We use `className="origin-top-left"` on the inner div to anchor transforms at the top-left corner, making coordinate math straightforward — `(0,0)` in canvas space maps to `(panX, panY)` in screen space.

## Toolbar Zoom Controls

```tsx
onToolIn={() => setZoom((z) => clampZoom(z + zoomStep))}
onZoomOut={() => setZoom((z) => clampZoom(z - zoomStep))}
```

The toolbar displays current zoom as a percentage (`Math.round(zoom * 100)%`) and provides ± buttons. These are alternatives for users who prefer buttons over scroll-wheel zoom.

## Smooth Pinch Zoom via Wheel Events

Modern trackpads emit `wheel` events with fractional `deltaY` values. The `deltaY * 0.01` multiplier in the Ctrl+wheel handler naturally supports smooth two-finger pinch zoom on trackpads. Each small pinch increment produces a small zoom change.

**Why not `gesturechange` events?** Safari's `gesturechange` is non-standard and doesn't work in Chrome/Firefox. Using `wheel` events with `ctrlKey` detection is the cross-browser approach.

## Mobile Touch Support

The canvas surface has `className="touch-none"` which disables the browser's default touch behaviors (scroll, pinch-zoom page, double-tap zoom). This is essential — without it, the browser would interpret canvas gestures as page-level navigation.

All pointer events (`onPointerDown`, `onPointerMove`, `onPointerUp`, `onPointerCancel`) use the Pointer Events API, which unifies mouse, touch, and stylus input into a single event model. This avoids needing separate `touchstart`/`mousedown` handlers.

Items have `className="touch-manipulation"` which:
- Disables browser double-tap zoom on item hit targets
- Enables smooth touch scrolling within scrollable sub-elements (like kanban columns)

## Cursor Feedback

```tsx
style={{ cursor: isPanMode ? "grab" : isCreateMode ? "crosshair" : "default" }}
```

- **"grab"**: When hand tool is active, indicating the user can drag to pan.
- **"crosshair"**: When a creation tool is active, indicating click-to-place.
- **"default"**: In select mode (default arrow cursor).

The cursor changes are purely visual — they don't affect behavior, which is controlled by tool mode state.

## Design Rationale

1. **No inertia/kinetic panning**: Panning follows the pointer exactly with no momentum. This is simpler to implement, uses less CPU, and avoids the "coasting past target" problem common in map UIs.

2. **Coordinate math in screen space**: All drag math works in `clientX/clientY` (screen pixels), then divides by `zoom` to convert to canvas space. This is simpler than tracking canvas-space coordinates and converting back.

3. **No debouncing on pan state updates**: `setPan` is called on every `pointerMove` event (potentially 60+ times/second). React batches these updates and only commits the latest state on the next frame, so there's no performance penalty from "too many setState calls."
