# 56 — WorkspaceShell Layout Component

`WorkspaceShell` is the main layout component — the outer shell that organizes every other UI element. At 463 lines, it is the largest single component in the app.

## Files referenced

- `src/app/components/WorkspaceShell.tsx` — 463-line layout component
- `src/app/components/BoardExplorer.tsx` — left panel / mobile drawer
- `src/app/components/BoardCanvas.tsx` — center area
- `src/app/components/AssistantPanel.tsx` — right panel / mobile drawer
- `src/app/components/ThemeProvider.tsx` — theme hook

## Component overview

`WorkspaceShell` renders four zones:

```
┌──────────────────────────────────────────────────────────┐
│ Header (44px, compact)                                    │
│ [logo] [board title] ... [theme] [avatar]                │
├──────────┬────────────────────────┬──────────────────────┤
│ Left     │ Center (Canvas)        │ Right                │
│ Sidebar  │                        │ Panel                │
│ 260px    │ flex-1                 │ 340px                │
│          │                        │                      │
│ Board    │ BoardCanvas            │ AssistantPanel       │
│ Explorer │                        │                      │
│          │                        │                      │
├──────────┴────────────────────────┴──────────────────────┤
│ Mobile Bottom Nav (56px)                        lg:hidden │
│ [Boards] [Chat] [+] [Tasks] [Core]                       │
└──────────────────────────────────────────────────────────┘
```

## Desktop layout: 3-panel

On screens ≥ 1024px wide (`lg:` breakpoint), the layout uses three panels:

### Left sidebar — BoardExplorer

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
  <div className="flex w-[260px] min-w-0 flex-1 flex-col overflow-y-auto p-3">
    <BoardExplorer
      activeBoardId={activeBoardId}
      initialBoards={boards}
      onBoardCreated={handleBoardCreated}
      onBoardSelect={setActiveBoardId}
      onItemAdded={refreshCanvas}
    />
  </div>
</aside>
```

**Key details:**
- `lg:flex` — visible only on desktop, hidden on mobile
- `transition-all duration-200` — smooth collapse/expand animation
- Width toggles between 260px and 0, with `overflow: hidden` hiding content
- Inner div maintains `w-[260px]` so content doesn't reflow during collapse
- `BoardExplorer` is rendered inside a scrollable container

### Center — BoardCanvas

```tsx
<div className="relative flex min-w-0 flex-1 flex-col">
  {/* Left toggle button */}
  <button
    className="absolute left-0 top-1/2 z-10 ... lg:flex"
    onClick={() => setLeftOpen((v) => !v)}
  >
    {leftOpen ? <ChevronLeft /> : <ChevronRight />}
  </button>

  <BoardCanvas
    boardId={activeBoardId}
    refreshKey={canvasRefreshKey}
    onRefreshNeeded={refreshCanvas}
  />

  {/* Right toggle button */}
  <button
    className="absolute right-0 top-1/2 z-10 ... lg:flex"
    onClick={() => setRightOpen((v) => !v)}
  >
    {rightOpen ? <ChevronRight /> : <ChevronLeft />}
  </button>
</div>
```

**Toggle buttons:** Two 16×48px buttons at the left and right edges, vertically centered. They toggle sidebar visibility. When the left sidebar is open, the button shows `ChevronLeft` (click to close). When closed, it shows `ChevronRight` (click to open). The right sidebar inverts this logic.

### Right panel — AssistantPanel

```tsx
<aside
  className="hidden shrink-0 flex-col border-l transition-all duration-200 lg:flex"
  style={{
    width: rightOpen ? "340px" : "0",
    overflow: "hidden",
    background: "var(--bg-sidebar)",
    borderColor: "var(--border)",
  }}
>
  <div className="flex w-[340px] min-h-0 flex-1 flex-col">
    <AssistantPanel
      boardId={activeBoardId}
      onCanvasChanged={refreshCanvas}
    />
  </div>
</aside>
```

Same collapse logic as the left sidebar but 340px wide. `AssistantPanel` uses `flex min-h-0 flex-1 flex-col` so it can scroll internally without breaking the shell layout.

## Mobile layout: single panel + bottom nav

On screens < 1024px, the layout simplifies:

- Both sidebars are hidden (`lg:flex` / `lg:hidden`)
- The canvas takes the full width
- A 56px bottom navigation bar provides access to panels via slide-up drawers

### Bottom navigation bar

```tsx
<nav
  className="flex shrink-0 items-center border-t lg:hidden"
  style={{
    background: "var(--bg-surface)",
    borderColor: "var(--border)",
    height: "56px",
  }}
>
  {/* 5 navigation items */}
</nav>
```

Five nav items, each with `flex-1` to divide equally:

| Item | Icon | Action |
|------|------|--------|
| Boards | `LayoutDashboard` | Toggle boards drawer |
| Chat | `Bot` | Toggle chat drawer |
| + | `Plus` (in accent circle) | Opens boards drawer (quick-create) |
| Tasks | `Settings` | Navigate to `/tasks` |
| Core | `Code2` | Navigate to `/core` |

The `+` button uses a 40×40px circular accent background to draw attention as the primary action.

Tasks and Core are `Link` components (not buttons) because they navigate to separate pages.

### Mobile slide-up drawers

Two drawers for `"boards"` and `"chat"` panels:

```tsx
{mobilePanel === "boards" && (
  <>
    {/* Overlay backdrop */}
    <div
      className="animate-fade-in fixed inset-0 z-40 lg:hidden"
      onClick={closeMobile}
      style={{ background: "var(--bg-overlay)" }}
    />

    {/* Drawer */}
    <div
      className="animate-slide-up fixed inset-x-0 bottom-14 z-50 rounded-t-2xl border-t lg:hidden"
      style={{
        background: "var(--bg-surface)",
        borderColor: "var(--border)",
        maxHeight: "75dvh",
        overflow: "auto",
      }}
    >
      {/* Header with title and close button */}
      <div className="flex items-center justify-between border-b p-4">
        <span className="text-sm font-semibold">Boards & Widgets</span>
        <button onClick={closeMobile}><X size={18} /></button>
      </div>

      {/* Content */}
      <div className="p-4">
        <BoardExplorer ... />
      </div>
    </div>
  </>
)}
```

Both drawers share the same pattern:
1. **Overlay backdrop** — Semi-transparent layer (`--bg-overlay`) that dims the canvas. Clicking it closes the drawer.
2. **Drawer panel** — Slides up from the bottom with `animate-slide-up` animation (250ms). Rounded top corners (`rounded-t-2xl`). Positioned `bottom-14` (above the 56px nav bar).

Differences:
- **Boards drawer:** `maxHeight: "75dvh"` with `overflow: auto` — scrollable content
- **Chat drawer:** `height: "72dvh"` — fixed height, the `AssistantPanel` handles internal scrolling

**Why boards uses maxHeight and chat uses height.** The boards drawer content varies in length (depends on number of boards). Using `maxHeight` allows shorter content to not stretch. The chat drawer contains the `AssistantPanel` which always fills its container, so fixed `height` ensures the chat input is always visible at the bottom.

### Mobile drawer interaction

When selecting a board or adding an item from the mobile drawer, the drawer auto-closes:

```tsx
onBoardSelect={(id) => {
  setActiveBoardId(id);
  closeMobile();
}}
onItemAdded={() => {
  refreshCanvas();
  closeMobile();
}}
```

This is the expected mobile pattern — after completing an action in a sheet, dismiss it to return to the content.

## Header bar

The header is a compact 44px bar (`h-11`) shared between desktop and mobile:

```tsx
<header
  className="flex h-11 shrink-0 items-center gap-3 border-b px-3"
  style={{
    background: "var(--bg-surface)",
    borderColor: "var(--border)",
    boxShadow: "var(--shadow-sm)",
  }}
>
```

Layout: left-aligned logo + separator + board title, right-aligned controls + theme toggle + user avatar.

### Desktop vs mobile header elements

| Element | Desktop | Mobile |
|---------|---------|--------|
| Menu (hamburger) | Hidden | Shown (opens boards drawer) |
| Board title | Shows full title | Truncated to 160px max |
| Core link | Shown | Hidden |
| Tasks link | Shown | Hidden |
| Theme toggle | Shown | Shown |
| User avatar/signout | Shown | Shown |

### User signout

The avatar button calls `signOut({ callbackUrl: "/login" })` from `next-auth/react`:

```tsx
<button
  onClick={() => signOut({ callbackUrl: "/login" })}
  title={`Sign out (${userEmail})`}
>
  {initials}
</button>
```

The initials are derived from the first character of the email: `userEmail?.[0]?.toUpperCase() ?? "U"`.

## State management

`WorkspaceShell` manages five pieces of state:

```typescript
const [boards, setBoards] = useState(initialBoards);
const [activeBoardId, setActiveBoardId] = useState<string | null>(
  initialBoards[0]?.id ?? null
);
const [canvasRefreshKey, setCanvasRefreshKey] = useState(0);
const [leftOpen, setLeftOpen] = useState(true);
const [rightOpen, setRightOpen] = useState(true);
const [mobilePanel, setMobilePanel] = useState<MobilePanel>(null);
```

### activeBoardId

The ID of the currently viewed board. Initialized to the first board in the list. Passed down to:
- `BoardCanvas` (renders the active board)
- `BoardExplorer` (highlights the active board)
- `AssistantPanel` (scopes chat to the active board)
- Header (displays the active board title)

### canvasRefreshKey

An integer counter incremented to trigger canvas re-fetches. When items are added, deleted, or modified, calling `refreshCanvas()` increments the key:

```typescript
const refreshCanvas = useCallback(() => {
  setCanvasRefreshKey((k) => k + 1);
}, []);
```

`BoardCanvas` receives `refreshKey={canvasRefreshKey}` and re-fetches board data when the key changes. This is the standard React pattern for imperatively triggering a re-fetch in a component that manages its own data.

### boards

The full board list. Updated when new boards are created via `handleBoardCreated`:

```typescript
const handleBoardCreated = useCallback((board: Board) => {
  setBoards((prev) => [board, ...prev]);
}, []);
```

New boards are prepended to the list (newest first).

### Sidebar toggle state

`leftOpen` and `rightOpen` control sidebar visibility on desktop. Default to `true` (visible). Persisted in React state only — sidebar visibility resets on page refresh.

### mobilePanel

`null | "boards" | "chat"` — controls which mobile drawer is shown. `null` means no drawer. Toggled by bottom nav buttons. Set to `null` by `closeMobile()` or when selecting a board.

## Viewport handling

The root div uses `h-dvh` instead of `h-screen`:

```tsx
<div className="flex h-dvh flex-col overflow-hidden" ...>
```

**Why `h-dvh` and not `h-screen`.** `dvh` (dynamic viewport height) accounts for mobile browser chrome (address bar, navigation buttons) that appears and disappears during scrolling. `100vh` / `h-screen` causes content to be hidden behind these bars. `dvh` is supported in all modern mobile browsers and ensures the app fills the actual visible area.

## Design token usage

Every color and shadow in `WorkspaceShell` uses design tokens via `style` attributes:

```typescript
style={{
  background: "var(--bg-surface)",
  borderColor: "var(--border)",
  boxShadow: "var(--shadow-sm)",
  color: "var(--text-2)",
}}
```

This applies to:
- Header bar (`bg-surface`, `shadow-sm`)
- Sidebar panels (`bg-sidebar`)
- Bottom nav (`bg-surface`)
- Toggle buttons (`bg-surface`, `shadow-sm`)
- Overlay backdrops (`bg-overlay`)
- Active and inactive text (`accent`, `text-1/2/3`)
- Hover states (`accent-light`)
- Accent buttons (`accent`, `accent-fg`)

No hex colors, no Tailwind color classes. All visual styling comes from the token system (see chapter 54).

## Props

```typescript
type Props = {
  initialBoards: Board[];
  userEmail: string;
};
```

- `initialBoards` — Server-side fetched board list passed as initial state
- `userEmail` — The user's email from the session, used for display name and sign-out

**Why `initialBoards` is a prop, not fetched by the component.** The component receives server-fetched data to avoid a loading flash. The first render shows boards immediately. Subsequent board creation/selection updates the client-side state.
