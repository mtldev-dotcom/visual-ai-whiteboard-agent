# 57 — Board Explorer Component

`BoardExplorer` is the board management sidebar component — the primary interface for browsing, searching, creating, and selecting boards. It appears in the desktop sidebar and as the mobile boards drawer.

## Files referenced

- `src/app/components/BoardExplorer.tsx` — 373-line component
- `src/app/components/WidgetLibrary.tsx` — embedded widget library component
- `src/app/components/WorkspaceShell.tsx` — parent that renders BoardExplorer

## Component overview

`BoardExplorer` manages five distinct areas:

```
┌─────────────────────────────┐
│ BOARDS    [template] [+]   │  Section header with actions
├─────────────────────────────┤
│ 🔍 Search boards…           │  Debounced search input
├─────────────────────────────┤
│ <Create board form>         │  Inline form (conditionally shown)
├─────────────────────────────┤
│ 📁 Board 1                  │
│   📄 Sub-board 1.1          │  Board list (hierarchical)
│   📄 Sub-board 1.2          │
│ 📁 Board 2                  │
├─────────────────────────────┤
│ WIDGETS                     │
│ ┌─────┐ ┌─────┐ ┌─────┐   │
│ │Sticky│ │Text │ │Mark │   │  Widget library
│ │Note │ │Block│ │down │   │
│ └─────┘ └─────┘ └─────┘   │
└─────────────────────────────┘
```

## Props

```typescript
type Props = {
  initialBoards: Board[];
  activeBoardId: string | null;
  onBoardSelect: (boardId: string) => void;
  onBoardCreated: (board: Board) => void;
  onItemAdded?: () => void;
};
```

Every prop is a callback or data feed from the parent `WorkspaceShell`:
- `initialBoards` — seed data, used to initialize the local `boards` state
- `activeBoardId` — which board is highlighted in the list
- `onBoardSelect` — called when user clicks a board (parent updates activeBoardId)
- `onBoardCreated` — called after successful board creation (parent prepends to list)
- `onItemAdded` — called after widget library adds a canvas item (parent refreshes canvas)

## State

```typescript
const [boards, setBoards] = useState(initialBoards);
const [search, setSearch] = useState("");
const [searchResults, setSearchResults] = useState<Board[] | null>(null);
const [searching, setSearching] = useState(false);
const [creating, setCreating] = useState(false);
const [newTitle, setNewTitle] = useState("");
const [showCreate, setShowCreate] = useState(false);
const [showTemplates, setShowTemplates] = useState(false);
const [templates, setTemplates] = useState<...>([]);
const [applyingTemplate, setApplyingTemplate] = useState<string | null>(null);
```

Eight pieces of state track the component's various UI modes.

### Board list state

`boards` holds the local copy of the board list. It starts as `initialBoards` and is updated when boards are created or templates are applied. This local state means the BoardExplorer can show newly created boards immediately without waiting for a parent re-render.

### Search state

`search`, `searchResults`, `searching` — the search tri-state:
- `search` — the raw input value
- `searchResults` — null when not searching, array when results arrive
- `searching` — true during network request (shows spinner)

### Create state

`showCreate`, `newTitle`, `creating` — the inline create form:
- `showCreate` — toggle the form visibility
- `newTitle` — the input value
- `creating` — loading state while the create request is in-flight

### Template state

`showTemplates`, `templates`, `applyingTemplate` — the template picker:
- `showTemplates` — toggle the template picker
- `templates` — lazy-loaded list of available templates
- `applyingTemplate` — which template is currently being applied (for loading state)

## Search: debounced server-side

The search input triggers a debounced fetch to `GET /api/boards?q=...`:

```typescript
useEffect(() => {
  const q = search.trim();
  if (searchTimer.current) clearTimeout(searchTimer.current);
  searchTimer.current = setTimeout(async () => {
    if (!q) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/boards?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as { boards?: Board[] };
      setSearchResults(data.boards ?? []);
    } finally {
      setSearching(false);
    }
  }, 300);
}, [search]);
```

**Debounce mechanism:** A `useRef` holds the timer ID. Each keystroke clears the previous timer and starts a new 300ms timer. Only when the user stops typing for 300ms does the network request fire.

**Empty query:** When `search.trim()` is empty, `searchResults` is set to `null`. The component falls back to displaying the full `boards` list:

```typescript
const displayed = search.trim()
  ? (searchResults ?? boards)
  : boards;
```

**Why server-side search.** Searching locally would only search the loaded boards. Server-side search searches the entire workspace, finding boards not in the current view (e.g., archived or deeply nested boards). The endpoint delegates to `searchBoardsForWorkspace(workspaceId, query)`.

**Loading indicator:** A small spinning circle appears in the search input while `searching` is true:
```tsx
{searching && (
  <span
    className="h-3 w-3 animate-spin rounded-full border border-t-transparent"
    style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
  />
)}
```

## Board list: hierarchical rendering

Boards are displayed in a tree structure:

```typescript
const topLevel = displayed.filter((b) => !b.parentBoardId);
const subBoards = (parentId: string) =>
  displayed.filter((b) => b.parentBoardId === parentId);
```

Top-level boards are rendered first. Sub-boards are rendered nested under their parent with `pl-7` (additional left padding):

```tsx
{topLevel.map((board) => {
  const subs = subBoards(board.id);
  const isActive = activeBoardId === board.id;
  return (
    <div key={board.id}>
      {/* Parent board button */}
      <button
        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium ..."
        onClick={() => onBoardSelect(board.id)}
        style={{
          background: isActive ? "var(--accent-light)" : "transparent",
          color: isActive ? "var(--accent)" : "var(--text-2)",
        }}
      >
        <FolderOpen size={13} />
        <span className="flex-1 truncate">{board.title}</span>
        {subs.length > 0 && <ChevronRight size={11} />}
      </button>

      {/* Sub-boards */}
      {subs.map((sub) => (
        <button
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 pl-7 text-left text-xs ..."
          key={sub.id}
          onClick={() => onBoardSelect(sub.id)}
          style={{
            background:
              activeBoardId === sub.id
                ? "var(--accent-light)"
                : "transparent",
            color:
              activeBoardId === sub.id
                ? "var(--accent)"
                : "var(--text-3)",
          }}
        >
          <span className="h-3 w-3 rounded-sm border" />
          <span className="flex-1 truncate">{sub.title}</span>
        </button>
      ))}
    </div>
  );
})}
```

**Active state:** The active board gets `--accent-light` background with `--accent` text color. Others are transparent/`--text-2` (top-level) or `--text-3` (sub-boards) with hover states applied via `onMouseEnter`/`onMouseLeave`.

**Hover state pattern:**
```typescript
onMouseEnter={(e) => {
  if (!isActive)
    (e.currentTarget as HTMLElement).style.background = "var(--bg-surface)";
}}
onMouseLeave={(e) => {
  if (!isActive)
    (e.currentTarget as HTMLElement).style.background = "";
}}
```

Hover only applies to non-active items. The active item's accent background is never overridden by hover.

**Sub-board icon:** Sub-boards use a simple square border (`rounded-sm border`) instead of `FolderOpen` to distinguish them visually. They are indented with `pl-7` (28px left padding in addition to the 10px base), creating a clear visual hierarchy.

## Create board form

An inline form toggled by the `+` button in the section header:

```tsx
{showCreate && (
  <div className="animate-scale-in rounded-lg border p-2" ...>
    <input
      autoFocus
      className="mb-2 w-full rounded-md border px-2.5 py-1.5 text-xs outline-none"
      onKeyDown={(e) => e.key === "Enter" && createBoard()}
      onChange={(e) => setNewTitle(e.target.value)}
      placeholder="Board name…"
      value={newTitle}
    />
    <div className="flex gap-1.5">
      <button
        className="flex-1 rounded-md py-1 text-xs font-medium"
        disabled={creating || !newTitle.trim()}
        onClick={createBoard}
      >
        {creating ? "Creating…" : "Create"}
      </button>
      <button onClick={() => { setShowCreate(false); setNewTitle(""); }}>
        Cancel
      </button>
    </div>
  </div>
)}
```

**Animation:** `animate-scale-in` — 150ms scale from 0.95 to 1 with a cubic-bezier curve.

**Keyboard support:** `Enter` triggers `createBoard()`.

**Disabled state:** The Create button is disabled when `creating` is true or the title is empty. During creation, it shows "Creating…" instead of "Create".

### Create flow

```typescript
const createBoard = useCallback(async () => {
  const title = newTitle.trim();
  if (!title) return;
  setCreating(true);
  try {
    const res = await fetch("/api/boards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    const data = (await res.json()) as { board?: Board; error?: string };
    if (data.board) {
      setBoards((prev) => [data.board!, ...prev]);
      onBoardCreated(data.board!);
      onBoardSelect(data.board!.id);
      setNewTitle("");
      setShowCreate(false);
    }
  } finally {
    setCreating(false);
  }
}, [newTitle, onBoardCreated, onBoardSelect]);
```

After creation, the new board is:
1. Prepended to the local `boards` list (appears at top)
2. Passed to the parent via `onBoardCreated` (parent updates its state)
3. Selected via `onBoardSelect` (canvas switches to new board)
4. Form is cleared and hidden

## Template picker

Three templates are available: blank, project hub, and weekly sprint. The template list is lazy-loaded — only fetched when the user first opens the picker:

```typescript
async function openTemplates() {
  setShowTemplates(true);
  if (templates.length) return;  // Already loaded, skip fetch
  const res = await fetch("/api/boards/from-template");
  const data = (await res.json()) as { templates?: ... };
  setTemplates(data.templates ?? []);
}
```

The `GET /api/boards/from-template` endpoint returns available templates. The `POST /api/boards/from-template` endpoint creates a board from a template:

```typescript
async function applyTemplate(templateId: string) {
  setApplyingTemplate(templateId);
  try {
    const res = await fetch("/api/boards/from-template", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId }),
    });
    const data = (await res.json()) as { boardId?: string; boardTitle?: string };
    if (data.boardId && data.boardTitle) {
      const board: Board = {
        id: data.boardId,
        title: data.boardTitle,
        parentBoardId: null,
      };
      setBoards((prev) => [board, ...prev]);
      onBoardCreated(board);
      onBoardSelect(board.id);
      setShowTemplates(false);
    }
  } finally {
    setApplyingTemplate(null);
  }
}
```

Each template button is disabled while that specific template is being applied (`disabled={applyingTemplate === t.id}`).

## Widget library

At the bottom of the BoardExplorer, the `WidgetLibrary` component provides drag-and-drop widgets for adding canvas items:

```tsx
<WidgetLibrary activeBoardId={activeBoardId} onItemAdded={onItemAdded} />
```

`activeBoardId` is required — widgets cannot be added without a selected board. `onItemAdded` bubbles up to the parent `WorkspaceShell` to trigger a canvas refresh.

## Empty state

When there are no boards and no search query, a friendly empty state is shown:

```tsx
{topLevel.length === 0 && !search && (
  <div className="flex flex-col items-center gap-2 rounded-xl py-6 text-center" ...>
    <FolderOpen size={28} />
    <p className="text-xs">No boards yet</p>
    <button
      className="rounded-lg px-3 py-1.5 text-xs font-medium"
      onClick={() => setShowCreate(true)}
    >
      Create one
    </button>
  </div>
)}
```

The "Create one" button opens the inline create form (same as clicking the `+` button). This call-to-action gives new users a clear path forward.

## Design token usage

Like all components, `BoardExplorer` uses CSS custom properties for all visual styling:

| Element | Token |
|---------|-------|
| Section header | `--text-3` (uppercase, tracking-widest) |
| Action buttons | `--text-3` default, `--accent-light` hover |
| Search input background | `--bg-surface` |
| Search input border | `--border` |
| Form background | `--bg-surface` with `--accent` border |
| Form input background | `--bg-sidebar` |
| Create button | `--accent` background, `--accent-fg` text |
| Board items (active) | `--accent-light` background, `--accent` text |
| Board items (inactive) | `--text-2` / `--text-3` text |
| Hover state | `--bg-surface` background |
| Empty state | `--text-3` text |
| Template cards | `--bg-sidebar` with `--border` |
| Template card hover | `--accent` border |

## Desktop vs mobile

`BoardExplorer` is rendered identically on desktop and mobile — same component, same state, same behavior. The parent (`WorkspaceShell`) wraps it differently:

- **Desktop:** Rendered in a 260px sidebar panel with scrolling
- **Mobile:** Rendered in a slide-up drawer with `maxHeight: 75dvh` and scrolling

The component itself does not know or care about the difference. This is good separation of concerns — the component handles board logic, the parent handles layout presentation.
