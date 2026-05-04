# User Flow Guide — Manual Testing Reference

**App stage:** Production-ready MVP. Auth, real DB-backed canvas, OpenRouter LLM, and all core flows wired end-to-end.

**Before testing:**

```bash
docker compose up -d postgres
npm run dev
```

Set `LLM_PROVIDER=openrouter` and `OPENROUTER_API_KEY` in `.env.local` to enable real LLM responses. Set `LLM_PROVIDER=local` to use the deterministic stub (no API key needed).

Open `http://localhost:3000`.

---

## How to read this guide

Each flow lists:

- **Where:** the URL or screen to start on.
- **Steps:** what to do, in order.
- **What works now:** confirmed working in current app stage.
- **Known limitations:** gaps that are expected at this stage.

---

## Flow 1 — Sign up

**Where:** `http://localhost:3000/signup`

1. Fill in email, name (optional), and password.
2. Click "Create account".
3. You are automatically signed in and redirected to `/`.
4. A workspace is created for your account on first sign-in.

**What works:** form validation, POST to `/api/auth/signup`, auto sign-in via NextAuth, workspace creation.

**Known limitations:** no email verification, no OAuth providers, no "forgot password" flow.

---

## Flow 2 — Sign in and session protection

**Where:** `http://localhost:3000`

1. Open `http://localhost:3000` while signed out.
2. Confirm you are redirected to `/login`.
3. Enter your credentials and click "Sign in".
4. Confirm you land on `/` (workspace shell).
5. Try `/tasks` while signed out — confirm redirect to `/login?callbackUrl=/tasks`.

**What works:** JWT session, cookie-based route protection via `src/proxy.ts`, `requireSession()` on all API routes.

---

## Flow 3 — Whiteboard workspace shell

**Where:** `http://localhost:3000` (signed in)

### Desktop layout

1. Open on a screen wider than 1024px.
2. Confirm three-column layout: left sidebar (Board Explorer + Widgets), center canvas, right assistant panel.
3. Confirm header shows "Visual AI Whiteboard" with a Core link and board title.
4. Bottom navigation is hidden at desktop width.

### Mobile layout

1. Open at ≤ 1024px width (or use DevTools device emulation at 390px).
2. Single-column layout; "Boards" toggle opens a drawer.
3. Bottom navigation shows five tabs: Chat, Board, Widgets, Tasks, Core.
4. Tap **Tasks** — navigates to `/tasks`. Tap **Core** — navigates to `/core`.

**What works:** layout, header, three-column grid, responsive breakpoints, bottom nav routing.

---

## Flow 4 — Board explorer (real data)

**Where:** `http://localhost:3000`, left sidebar

1. Sidebar shows boards you have created (not demo data).
2. On first use the list is empty — an "No boards yet" message is shown.
3. Click **New board** — enter a title and confirm — board appears in the list.
4. Select a board — canvas loads items for that board.
5. Type in the search input — list filters to matching board names in real time.
6. Clear the search — full list restores.

**What works:** real boards from DB via `listBoardsForWorkspace`, create button calls `POST /api/boards`, client-side search filter, board selection state.

---

## Flow 5 — Canvas pan and zoom

**Where:** `http://localhost:3000`, center canvas area

1. Click and hold on the canvas background — drag to pan. All items move together.
2. Click **+** in the zoom control (top-right of canvas) — items scale up. Maximum 180%.
3. Click **−** — items scale down. Minimum 50%.
4. Percentage readout updates.

**What works:** pointer-capture panning, zoom buttons with clamped range.

---

## Flow 6 — Canvas item types

**Where:** `http://localhost:3000`, canvas with items added

Canvas items are persisted structured objects. The following types can be rendered:

| Type              | Visual style                   |
|-------------------|--------------------------------|
| `sticky_note`     | Yellow background              |
| `text`            | White, plain text              |
| `markdown`        | Green tint, pre-formatted      |
| `link`            | Blue tint, URL display         |
| `image`           | White with image or SVG        |
| `task_list`       | White, checkbox list           |
| `notes`           | Warm cream background          |
| `custom_html`     | Sandboxed iframe (see Flow 13) |

Add items via the assistant chat or the widget library to see each type.

---

## Flow 7 — Item selection

**Where:** `http://localhost:3000`, canvas with items

1. Click (or tap on mobile) any canvas item.
2. A green ring appears around the item; a **Selected** badge shows above it.
3. Click the canvas background — selection ring disappears.
4. Keyboard: Tab to an item, press Enter or Space to select it.

**What works:** click/tap selection, keyboard selection, deselect on background click.

---

## Flow 8 — Item move and resize (persisted)

**Where:** `http://localhost:3000`, canvas with items

### Move

1. Select a canvas item.
2. Drag it to a new position.
3. Release — the position updates immediately.
4. Refresh the page — item is at the new position (debounced PATCH persisted to DB).

### Resize

1. Select a canvas item.
2. Drag the green handle at the bottom-right corner.
3. Minimum size: 160×96px.
4. Refresh — resized dimensions persist.

**What works:** drag-to-move with pointer capture, zoom-corrected delta, resize handle, 600ms debounced PATCH to `/api/canvas-items/[id]`, DB persistence.

---

## Flow 9 — Item edit, copy, and delete

**Where:** `http://localhost:3000`, canvas with items

### Edit

1. Select an item and click **Edit** (desktop: right panel; mobile: bottom sheet).
2. An inline modal opens with editable title/text fields.
3. Click Save — content updates on the canvas.
4. Refresh — edited content persists.

### Copy

1. Select an item and click **Copy**.
2. A duplicate appears offset from the original.
3. The copy is a new DB record with its own ID.

### Delete

1. Select an item and click **Delete**.
2. A confirmation dialog appears.
3. Confirm — item is removed from the canvas.
4. Refresh — item does not reappear (soft-deleted in DB).

**What works:** inline edit modal PATCH, copy via POST, delete with dialog and DELETE request.

---

## Flow 10 — Mobile bottom sheet controls

**Where:** `http://localhost:3000` at ≤ 1024px width

1. Tap any canvas item.
2. Bottom sheet slides up showing: "Selected" label, item title, and four action buttons: Edit, Copy, Ask AI, Delete.
3. Tap **Close** or tap the canvas background — sheet dismisses.
4. Each action button works as described in Flow 9.

**What works:** bottom sheet visibility, all four action buttons wired.

---

## Flow 11 — Assistant chat (real LLM)

**Where:** `http://localhost:3000`, right panel (desktop) or Chat tab (mobile)

*(Requires `LLM_PROVIDER=openrouter` and a valid `OPENROUTER_API_KEY`.)*

1. Select a board.
2. Type: "Create a sticky note about onboarding" and press Enter.
3. A "thinking…" indicator appears while the LLM processes.
4. The assistant responds with a message.
5. A tool execution card appears for `add_canvas_item` with status "success" and a summary.
6. The canvas automatically refreshes and shows the new sticky note.

**What works:** POST to `/api/chat` with message history and `boardId`, tool call loop, execution cards, canvas refresh via `onCanvasChanged()`.

**Known limitations:** chat history is not persisted to the DB (cleared on page refresh). Persisting chat threads is a P1 task.

---

## Flow 12 — Board tools via assistant

**Where:** `http://localhost:3000`, assistant panel

The assistant has access to these tools:

| Tool                | What it does                                |
|---------------------|---------------------------------------------|
| `create_board`      | Creates a new board in the workspace        |
| `create_sub_board`  | Creates a board nested under a parent       |
| `add_canvas_item`   | Adds an item to the active board            |
| `update_canvas_item`| Updates position/size/content of an item   |
| `delete_canvas_item`| Soft-deletes an item (requires confirmed:true) |

**Try:** "Create a sub-board called Q2 Planning" — the sub-board appears indented under the current board in the explorer.

**What works:** all five tools execute against real DB, return structured results, and show execution cards in chat.

---

## Flow 13 — Sandboxed HTML widget confirmation gate

**Where:** `http://localhost:3000`, canvas with a `custom_html` item

1. A `custom_html` item shows a confirmation screen: title, description "Generated HTML is sandboxed and isolated.", and a green **Run** button.
2. Click **Run** — the item renders the iframe content.
3. The iframe has `sandbox="allow-scripts"` with no `allow-same-origin` — it cannot access the parent window, cookies, or localStorage.

**What works:** confirmation gate, Run button activates iframe `srcDoc`, secure sandbox attributes, no-referrer policy.

---

## Flow 14 — Widget library

**Where:** `http://localhost:3000`, left sidebar (desktop) or Boards drawer → Widgets section (mobile)

1. Scroll below the board list to the **Widgets** section.
2. Two widget cards: **Task List** (Productivity) and **Notes** (Notes).
3. Click either card — a new canvas item of that type appears on the active board.
4. Refresh — widget item persists.

**What works:** clicking a widget card POSTs to `/api/canvas-items` with default content and size, canvas refreshes via `onItemAdded` callback.

**Known limitations:** Kanban, markdown reader, and rich text editor widgets are P1 items not yet built.

---

## Flow 15 — Tasks page (real data)

**Where:** `http://localhost:3000/tasks`

1. Navigate to `/tasks` (mobile bottom nav "Tasks" tab or direct URL).
2. Header shows "Tasks" under "Workspace".
3. Click **New task** — form expands.
4. Fill title (required), priority, due date, and optional board association.
5. Click **Add task** — card appears in the list.
6. Click **Mark complete** on a task — card disappears (task marked complete in DB).
7. Refresh — completed tasks remain hidden (open tasks only are listed).

**What works:** real tasks from DB via `listOpenTasksForWorkspace`, create via `POST /api/tasks`, mark-complete via `PATCH /api/tasks/[id]`.

---

## Flow 16 — Core files editor

**Where:** `http://localhost:3000/core`

1. Navigate to `/core` (desktop header "Core" link or mobile bottom nav).
2. Left sidebar lists whitelisted files: CORE.md, ASSISTANT.md, TOOLS.md, SKILLS.md, RULES.md, MEMORY.md.
3. Click a filename — page scrolls to that file's editor section.
4. Each textarea is pre-filled with current content from `docs/agent-core/`.
5. Edit any file and click **Save** — content saves to disk.
6. Reload — saved content persists.
7. Attempting to save a file not on the whitelist → 403 error.

**What works:** server-rendered file list, live file read, server action save, path traversal protection, `revalidatePath` on save.

**Known limitations:** no diff preview, no version history. Saving overwrites directly.

---

## Flow 17 — Navigation between routes

| From     | To       | Method                                              |
|----------|----------|-----------------------------------------------------|
| `/`      | `/tasks` | Mobile bottom nav "Tasks" tab, or direct URL        |
| `/`      | `/core`  | Desktop header "Core" link, mobile "Core" tab       |
| `/core`  | `/`      | "Board" link in `/core` header                      |
| `/tasks` | `/`      | "Board" link in header, or direct URL               |
| Any page | `/login` | Click "Sign out" in board explorer                  |

**What works:** all routes render without error, all nav links wired, sign-out clears the session.

---

## Flows not yet testable

These are planned P1 features not yet implemented:

- **Persist chat threads:** messages clear on page refresh.
- **Board search persistence:** search is client-side filter only — no full-text DB search.
- **Undo/rollback for canvas changes:** no undo history yet.
- **`summarize_board` / `organize_board` tools:** not yet implemented.
- **Task/reminder assistant tools:** `create_task` and `create_reminder` tools not yet registered.
- **Kanban, markdown reader, rich text editor widgets:** not yet built.
- **Telegram integration:** server-side handlers are unit-tested; webhook and BotFather registration not configured.
- **OAuth or magic link auth:** credentials only for now.
- **Production deployment config:** no Vercel/Railway config yet.
