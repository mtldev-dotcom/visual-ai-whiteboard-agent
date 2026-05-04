# 58 — Mobile-First UX Patterns

This chapter catalogs every mobile-first design pattern used in the application. These patterns are not accidental — they are the result of deliberate decisions made throughout the codebase to ensure the app works well on phones first, with desktop as an enhanced experience.

## Core principle

Desktop whiteboard patterns must not be blindly squeezed onto mobile screens. The app must feel native on a phone — touch-friendly, legible, and navigable without precision pointing devices. Every UI element is designed for mobile first, then extended for desktop.

## Pattern 1: Compact header (44px)

The header bar is 44px tall (`h-11`), matching the iOS recommended minimum touch target height:

```tsx
// src/app/components/WorkspaceShell.tsx:71
<header className="flex h-11 shrink-0 items-center gap-3 border-b px-3">
```

**Why 44px.** 44 points is the iOS HIG minimum touch target. Below this, buttons become hard to tap accurately on mobile. The header uses every pixel carefully:
- 7px tall buttons (`h-7`) inside
- 11px font size for secondary text
- 3px horizontal padding (`px-3`)
- No wasted vertical space

**Desktop:** Same header height. There's no reason to make it taller on desktop — the compact header works well at all sizes.

## Pattern 2: Bottom navigation bar (56px, 5 items)

On mobile, primary navigation moves to the bottom of the screen where thumbs naturally reach:

```tsx
// src/app/components/WorkspaceShell.tsx:268-360
<nav
  className="flex shrink-0 items-center border-t lg:hidden"
  style={{
    background: "var(--bg-surface)",
    borderColor: "var(--border)",
    height: "56px",
  }}
>
```

Five items, evenly distributed with `flex-1`:

| Label | Icon | Type | Action |
|-------|------|------|--------|
| Boards | `LayoutDashboard` | Button | Toggle boards drawer |
| Chat | `Bot` | Button | Toggle chat drawer |
| (none) | `Plus` (accent circle) | Button | Opens boards drawer |
| Tasks | `Settings` | Link | Navigate to `/tasks` |
| Core | `Code2` | Link | Navigate to `/core` |

**Why 56px for the nav bar.** 56dp is the Android Material Design standard for bottom navigation. Combined with the 44px header, the total chrome height is 100px, leaving the majority of the screen for content.

**Why bottom, not top.** Mobile users hold phones with thumbs near the bottom. Bottom navigation is reachable without adjusting grip. Top navigation requires hand repositioning.

**The + button as FAB substitute.** The center button uses a 40×40px accent-colored circle, functioning as a floating action button (FAB) integrated into the nav bar rather than floating above it. This avoids the z-index and overlap problems of traditional FABs.

**Visibility:** `lg:hidden` — the bottom nav disappears on screens ≥ 1024px, replaced by the desktop sidebar + header navigation.

## Pattern 3: Slide-up drawers with overlay

Mobile panels (boards, chat) appear as slide-up drawers from the bottom of the screen:

```tsx
{mobilePanel === "boards" && (
  <>
    {/* Overlay backdrop */}
    <div
      className="animate-fade-in fixed inset-0 z-40 lg:hidden"
      onClick={closeMobile}
      style={{ background: "var(--bg-overlay)" }}
    />

    {/* Drawer panel */}
    <div
      className="animate-slide-up fixed inset-x-0 bottom-14 z-50 rounded-t-2xl border-t lg:hidden"
      style={{
        background: "var(--bg-surface)",
        borderColor: "var(--border)",
        maxHeight: "75dvh",
        overflow: "auto",
      }}
    >
```

### Components of the drawer pattern

1. **Overlay backdrop** (`animate-fade-in`, 150ms):
   - Covers the entire viewport (`inset-0`)
   - Semi-transparent (`--bg-overlay`: `rgba(0,0,0,0.45)` light / `rgba(0,0,0,0.65)` dark)
   - Clicking it closes the drawer (`onClick={closeMobile}`)
   - `z-40` (below drawer, above content)

2. **Drawer panel** (`animate-slide-up`, 250ms):
   - Full width with rounded top corners (`rounded-t-2xl`)
   - Positioned above the bottom nav (`bottom-14` = 56px)
   - `z-50` (above overlay)
   - Height constraints per drawer type

### Boards drawer (scrollable)

```tsx
maxHeight: "75dvh",
overflow: "auto",
```

**Why maxHeight not height.** The boards list varies in length. New users might have only 1 board, power users might have 50. Using `maxHeight` allows short content to not stretch — the drawer is only as tall as needed, up to 75% of the viewport height.

### Chat drawer (fixed height)

```tsx
height: "72dvh",
```

**Why fixed height.** The chat panel contains a scrollable message list and a fixed input bar at the bottom. The `AssistantPanel` handles internal scrolling. Using a fixed height ensures the chat input is always visible — if the drawer were variable height, the input bar might end up off-screen.

### d-viewport-height

All drawer measurements use `dvh` (dynamic viewport height), not `vh`:

```
75dvh  → 75% of dynamic viewport height
72dvh  → 72% of dynamic viewport height
```

**Why dvh, not vh.** `100vh` in mobile Safari includes the space behind the URL bar. When the URL bar is visible, `100vh` extends beneath it, cutting off content. `dvh` accounts for the actual visible viewport, which changes as browser chrome appears and disappears. This prevents the drawer from being partially hidden behind mobile browser UI.

## Pattern 4: Collapsible sidebars (animated)

Desktop sidebars animate open and closed:

```tsx
<aside
  className="hidden shrink-0 flex-col border-r transition-all duration-200 lg:flex"
  style={{
    width: leftOpen ? "260px" : "0",
    overflow: "hidden",
    background: "var(--bg-sidebar)",
    borderColor: "var(--border)",
  }}
>
```

**Animation:** `transition-all duration-200` — 200ms smooth transition for the width change.

**Content preservation:** Inner div maintains `w-[260px]` even when the parent is `width: 0`:

```tsx
<div className="flex w-[260px] min-w-0 flex-1 flex-col overflow-y-auto p-3">
```

This prevents content from reflowing during the collapse animation. The content is simply clipped, not resized.

**Toggle buttons:** Two 16×48px buttons on the left and right edges of the canvas. They use ChevronLeft/ChevronRight icons that invert when the sidebar is closed.

## Pattern 5: Hide-on-mobile and desktop-only

The codebase uses consistent visibility classes:

| Class | Meaning |
|-------|---------|
| `lg:hidden` | Visible on mobile, hidden on desktop (≥1024px) |
| `hidden lg:flex` | Hidden on mobile, visible on desktop |
| `hidden lg:block` | Same as above but `display: block` |
| `hidden sm:block` | Hidden below 640px (small mobile) |
| `lg:max-w-xs` | Different max-width on desktop |

Examples from the codebase:

```tsx
// Bottom nav — mobile only
className="flex shrink-0 items-center border-t lg:hidden"

// Left sidebar — desktop only
className="hidden shrink-0 flex-col border-r transition-all duration-200 lg:flex"

// Mobile menu button — mobile only
className="flex h-7 w-7 items-center justify-center rounded-lg lg:hidden"

// Brand name — hidden on smallest screens
className="hidden text-sm font-semibold sm:block"

// Core link — desktop only
className="hidden h-7 items-center gap-1.5 rounded-lg px-2.5 text-xs lg:flex"

// Board title — wider on desktop
className="max-w-[160px] truncate text-sm font-medium lg:max-w-xs"
```

**Why these exact breakpoints:**
- `sm` (640px) — Small phones in landscape vs portrait
- `lg` (1024px) — Tablet/desktop threshold. Below this, the device is considered "mobile" and gets the mobile layout

The 1024px threshold is deliberately higher than many apps' 768px — tablets get the mobile layout. A 10" iPad in portrait orientation has limited horizontal space and benefits from the single-panel + drawer navigation model.

## Pattern 6: Tap interactions, not hover

No feature requires hover to operate:

```tsx
// Hover is an enhancement, never the only interaction path
onMouseEnter={(e) => {
  if (!isActive)
    (e.currentTarget as HTMLElement).style.background = "var(--bg-surface)";
}}
onMouseLeave={(e) => {
  if (!isActive)
    (e.currentTarget as HTMLElement).style.background = "";
}}
```

Hover only provides visual polish (background changes on buttons, border highlights). It never:
- Reveals hidden controls needed for core functionality
- Shows tooltips with essential information
- Triggers any action

**Why.** Touch devices have no hover state. Any interaction relying on hover is broken on mobile. The app uses `onClick` for all actions and treats hover as a decorative enhancement for desktop users.

## Pattern 7: Items bottom sheet (mobile canvas tools)

On mobile, canvas item controls use a bottom sheet instead of a floating toolbar:

- **Desktop:** Floating toolbar appears near selected items
- **Mobile:** Toolbar slides up from the bottom as a sheet

This avoids the precision targeting problem — on a small screen, reaching a small floating toolbar requires precise tapping. A wide bottom sheet is much easier to use.

## Pattern 8: No hover-only controls

Every control is accessible via click/tap:

- Board selection: `onClick`, not `onMouseEnter`
- Create board form: `onClick` on `+` button, not hover reveal
- Template picker: `onClick` on template icon
- Search: Input field, not search-on-type in a hover reveal
- Close drawers: `onClick` on X button or backdrop
- Theme toggle: `onClick`

There are exactly zero UI elements that can only be accessed via hover.

## Pattern 9: Board explorer as drawer (mobile)

The board list that lives in the desktop sidebar becomes a slide-up drawer on mobile:

```
Desktop:                    Mobile:
┌───┬──────────┬───┐       ┌──────────────┐
│ B │          │ A │       │              │
│ o │ Canvas   │ s │       │   Canvas     │
│ a │          │ s │       │   (full)     │
│ r │          │ t │       │              │
│ d │          │ . │       │              │
│ s │          │   │       ├──────────────┤
└───┴──────────┴───┘       │ Boards Chat  │
                           │ [+] Tsk Core │
                           └──────────────┘

Tap "Boards":
                           ┌──────────────┐
                           │ [overlay]    │
                           ├──────────────┤
                           │ Boards & Wid │
                           │ ──────────── │
                           │ 📁 Board 1   │
                           │ 📁 Board 2   │
                           │ ...          │
                           └──────────────┘
```

Both the desktop sidebar and mobile drawer render the exact same `BoardExplorer` component. The component itself doesn't know which context it's in — it receives the same props and renders the same UI.

## Pattern 10: Assistant as drawer (mobile)

The assistant chat panel follows the same pattern as boards — desktop sidebar becomes mobile drawer:

```
Desktop:                    Mobile:
Right sidebar (340px)       →    Slide-up drawer (72dvh)
```

The `AssistantPanel` component is rendered identically in both contexts. The parent handles layout.

## Pattern 11: Viewport height handling

The root layout uses `dvh` throughout:

```tsx
// Root container
<div className="flex h-dvh flex-col overflow-hidden" ...>

// Drawer constraints
maxHeight: "75dvh"
height: "72dvh"
```

**Why this matters.** Different mobile browsers handle the address bar differently:

| Browser | Behavior | h-screen result |
|---------|----------|----------------|
| iOS Safari | URL bar collapses on scroll | `100vh` includes space behind the bar |
| Chrome Android | URL bar collapses on scroll | Similar issues |
| Desktop Chrome | No collapsing chrome | `100vh` always works |

`dvh` adjusts dynamically as the browser chrome appears and disappears, ensuring the app always fills the visible viewport.

## Pattern 12: Overflow and scrolling

The layout uses `overflow-hidden` on the root and lets individual panels handle scrolling:

```tsx
// Root — no outer scrollbar
<div className="flex h-dvh flex-col overflow-hidden">

// Sidebar — scrollable board list
<div className="flex w-[260px] min-w-0 flex-1 flex-col overflow-y-auto p-3">

// Canvas — no scrolling (pan/zoom instead)
<div className="relative flex min-w-0 flex-1 flex-col">

// Drawer — scrollable content
style={{ maxHeight: "75dvh", overflow: "auto" }}
```

This prevents the classic mobile layout bug where the entire page scrolls instead of the content panel.

## Pattern 13: Touch-friendly tap targets

All interactive elements respect minimum touch target sizes:

| Element | Size | Standard |
|---------|------|----------|
| Header buttons | 28×28px (h-7, w-7) | Acceptable — in toolbar context |
| Sidebar toggle buttons | 16×48px | Acceptable — large hit area despite narrow appearance |
| Bottom nav items | ~75×56px | Exceeds 48dp minimum |
| + button (FAB) | 40×40px | Exceeds 44pt minimum |
| Board list items | Full width, ~36px tall | Wide hit area |
| Drawer close button | Tappable icon + wide header bar | Easy to hit |

**Note on header buttons:** 28×28px is below Apple's 44pt recommendation. However, they are in a header toolbar context (where Apple allows 28pt icons in navigation bars) and are surrounded by empty space that effectively extends the touch target.

## Pattern 14: Desktop-first enhancements

Elements that are desktop-only (hidden on mobile) are added as enhancements, not requirements:

```tsx
// Desktop: sidebar toggle chevrons
className="absolute left-0 top-1/2 z-10 hidden ... lg:flex"

// Desktop: Core/Tasks header links
className="hidden h-7 items-center gap-1.5 rounded-lg px-2.5 text-xs lg:flex"

// Desktop: board title wider
className="max-w-[160px] truncate text-sm font-medium lg:max-w-xs"
```

The app works without any of these. They improve the desktop experience but are never critical to functionality.

## Pattern 15: Animation for transitions

Animations provide spatial context — they help users understand where drawers come from and where they go:

```css
/* globals.css */
.animate-slide-up {
  animation: slide-up 0.25s cubic-bezier(0.32, 0.72, 0, 1);
}
.animate-fade-in {
  animation: fade-in 0.15s ease;
}
.animate-scale-in {
  animation: scale-in 0.15s cubic-bezier(0.16, 1, 0.3, 1);
}
```

- `slide-up` — Drawers: 250ms spring-like easing for a natural feel
- `fade-in` — Overlays: 150ms linear fade for the backdrop
- `scale-in` — Popovers (create form, template picker): 150ms with an overshoot curve

**Why these specific durations.** iOS uses 250-300ms for sheet presentations and 150-200ms for overlays. Matching platform conventions makes the app feel native.

## Summary: Desktop vs mobile decision tree

```
Is the user on a screen < 1024px wide?
  NO → Desktop layout
    ├─ Sidebars on left (260px) and right (340px)
    ├─ Canvas in center (flex-1)
    ├─ Sidebars collapsible
    └─ Top nav links visible

  YES → Mobile layout
    ├─ Full-width canvas
    ├─ Bottom nav bar (56px)
    ├─ Slide-up drawers for boards and chat
    ├─ FAB-style + button
    └─ Compact header
```

Every component is designed to work in both contexts. The `WorkspaceShell` component is the only place that branches based on screen size — all child components are presentation-agnostic.
