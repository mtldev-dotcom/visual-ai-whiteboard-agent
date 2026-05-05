# User Flow Guide - Manual Testing Reference

**App stage:** Production-ready MVP. Auth, real DB-backed canvas, persistent chat, OpenRouter LLM support, widget previews, canvas undo, native whiteboard toolbar tools, and Telegram webhook wiring are implemented.

**Before testing:**

```bash
docker compose up -d postgres
npm run dev
```

Set `LLM_PROVIDER=openrouter` and `OPENROUTER_API_KEY` in `.env.local` to enable real LLM responses. Set `LLM_PROVIDER=local` to use the deterministic stub.

Open `http://localhost:3000`.

---

## How to read this guide

Each flow lists:

- **Where:** the URL or screen to start on.
- **Steps:** what to do, in order.
- **What works now:** confirmed working in current app stage.
- **Known limitations:** expected gaps.

---

## Flow 1 - Sign up

**Where:** `http://localhost:3000/signup`

1. Fill in email, name (optional), and password.
2. Click **Create account**.
3. Confirm you are automatically signed in and redirected to `/`.
4. Confirm a workspace and Welcome Board are created.
5. Confirm the Welcome Board contains starter items: sticky notes, task list, and Kanban.

**What works now:** form validation, `POST /api/auth/signup`, NextAuth sign-in, workspace creation, onboarding board seed.

**Signup control:** set `APP_SIGNUP=disable` to block new account creation. `/signup` then shows a disabled state, `/login` hides the create-account link, and direct signup API calls return 403.

**Known limitations:** no email verification, OAuth, magic link, or forgot-password flow.

---

## Flow 2 - Sign in and session protection

**Where:** `http://localhost:3000`

1. Open `/` while signed out.
2. Confirm redirect to `/login`.
3. Enter credentials and click **Sign in**.
4. Confirm you land on `/`.
5. Try `/tasks` while signed out and confirm redirect to `/login?callbackUrl=/tasks`.

**What works now:** JWT session, cookie route protection via `src/proxy.ts`, `requireSession()` on protected API routes.

---

## Flow 3 - Whiteboard workspace shell

**Where:** `/` signed in

### Desktop layout

1. Open wider than 1024px.
2. Confirm three-column layout: board/widgets sidebar, center canvas, assistant panel.
3. Confirm header shows the app name, active board title, and Core link.
4. Confirm bottom navigation is hidden.

### Mobile layout

1. Open at <= 1024px width, or use DevTools at 390px.
2. Confirm single-column layout.
3. Tap **Boards** to open the board drawer.
4. Confirm bottom navigation shows Chat, Board, Widgets, Tasks, and Core.
5. Tap **Tasks** to navigate to `/tasks`; tap **Core** to navigate to `/core`.

**What works now:** responsive layout, board drawer, bottom nav routing.

---

## Flow 4 - Board explorer, search, and templates

**Where:** `/`, board sidebar or mobile board drawer

1. Confirm the sidebar shows real boards from DB.
2. Click **New board**, enter a title, and create it.
3. Select the board and confirm the canvas loads that board's items.
4. Type in search and confirm the list updates after a short debounce with a spinner while searching.
5. Clear search and confirm the full list returns.
6. Click the template button, choose Project Kickoff, Brainstorm Session, or Weekly Review.
7. Confirm a board is created from the template and selected.

**What works now:** board create, board selection, server-side board search via `GET /api/boards?q=...`, template list/create via `/api/boards/from-template`.

---

## Flow 5 - Canvas pan and zoom

**Where:** `/`, center canvas

1. Click and hold the canvas background and drag to pan.
2. Click **+** in the toolbar to zoom in.
3. Click **-** to zoom out.
4. Confirm the percentage readout updates.
5. Use trackpad/mouse wheel to pan; use Ctrl/Cmd + wheel to zoom.

**What works now:** pointer-capture panning, wheel pan/zoom, zoom buttons, clamped zoom from 30% to 250%.

---

## Flow 6 - Canvas item types

**Where:** `/`, canvas with items added

Canvas items are persisted structured objects. The following types render in the canvas:

| Type          | Visual style                                  |
| ------------- | --------------------------------------------- |
| `sticky_note` | Yellow note card                              |
| `text`        | Surface card with title/text                  |
| `markdown`    | Markdown-labeled preformatted card            |
| `link`        | Link card with URL                            |
| `board_link`  | Navigation card that opens another board      |
| `image`       | Image preview card                            |
| `task_list`   | Checkbox list card                            |
| `kanban`      | Three-column workflow board                   |
| `rich_text`   | Formatted notes with headings and callouts    |
| `reminders`   | Reminder list card                            |
| `drawing`     | Freehand pen stroke                           |
| `arrow`       | Connector arrow                               |
| `shape`       | Rectangle, ellipse, or diamond                |
| `frame`       | Dashed whiteboard frame                       |
| `section`     | Named section with solid header bar (key: N)  |
| `html_widget` | Sandboxed iframe widget with run confirmation |

Add items via the canvas toolbar, assistant chat, or widget library. For board links, create a `board_link` item with `content.targetBoardId`, then click **Open board** on the card. The active board should switch without opening a new browser route.

---

## Flow 7 - Whiteboard toolbar tools

**Where:** `/`, canvas toolbar

1. Pick Pen and drag on the canvas; confirm a freehand stroke appears and persists after refresh.
2. Pick Shape, choose rectangle/ellipse/diamond, drag on the canvas, and confirm the selected shape appears.
3. Pick Arrow and drag from start to end; confirm an arrow appears.
4. Pick Frame and drag a region; confirm a dashed frame appears.
5. Pick Text or Sticky, click or drag on the canvas, and confirm the new item enters inline edit.
6. Pick Task List and click on the canvas; confirm a task list item appears.
7. Pick Widget and confirm the board/widgets panel opens or focuses the widget library.
8. Try keyboard shortcuts outside inputs: `V`, `H`, `P`, `R`, `F`, `A`, `T`, `S`, `K`, `W`, `+`, and `-`.

**What works now:** toolbar mode selection, drag-create gestures, inline edit for simple items, keyboard shortcuts, and persisted POST to `/api/canvas-items`.

---

## Flow 8 - Item selection

**Where:** `/`, canvas with items

1. Click or tap any canvas item.
2. Confirm a selection ring appears.
3. Click the canvas background to clear selection.
4. Keyboard: Tab to an item, press Enter or Space to select it.

**What works now:** click/tap selection, keyboard selection, deselect on background click.

---

## Flow 9 - Item move, resize, and undo

**Where:** `/`, canvas with items

### Move

1. Drag an item to a new position.
2. Release and wait briefly for the debounced save.
3. Refresh and confirm the item remains at the new position.

### Resize

1. Select an item.
2. Drag the bottom-right handle.
3. Confirm minimum size is enforced at 160x96px.
4. Refresh and confirm dimensions persist.

### Undo

1. Move or resize an item.
2. Press `Ctrl+Z` on Windows/Linux or `Cmd+Z` on macOS.
3. Confirm the item returns to its prior position/size.
4. Confirm a small "Canvas change undone" toast appears.

**What works now:** move, resize, 600ms debounced PATCH, 20-entry client undo stack for move/resize rollback.

**Known limitations:** undo does not currently cover edit, copy, create, or delete; assistant `rollback_canvas_change` is not implemented yet.

---

## Flow 10 - Item edit, copy, and delete

**Where:** `/`, canvas with items

### Edit

1. Double-click a text, sticky note, shape, or frame item, or select it and click the inline edit action.
2. Update title/text directly inside the item.
3. Click the check button, press Ctrl/Cmd+Enter, or blur the editor.
4. Refresh and confirm edited content persists.

### Copy

1. Select an item and click **Copy**.
2. Confirm a duplicate appears offset from the original.
3. Confirm the copy persists after refresh.

### Delete

1. Select an item and click **Delete**.
2. Confirm the deletion dialog appears.
3. Confirm delete.
4. Refresh and confirm the item does not reappear.

**What works now:** inline edit PATCH for simple items, copy POST, delete confirmation, soft delete.

---

## Flow 11 - Mobile bottom sheet controls

**Where:** `/` at <= 1024px width

1. Tap any canvas item.
2. Confirm the bottom sheet shows Selected, the item title, and Edit, Copy, Refresh, Delete.
3. Use each action and confirm it matches desktop behavior.
4. Tap the close button or canvas background to dismiss.

**What works now:** mobile selected-item controls and action wiring.

---

## Flow 12 - Assistant chat and persisted history

**Where:** `/`, assistant panel or Chat tab

1. Select a board.
2. Type "Create a sticky note about onboarding" and submit.
3. Confirm the thinking card appears.
4. Confirm a tool execution card appears for `add_canvas_item`.
5. Confirm the canvas refreshes and shows the new item.
6. Ask a question that returns a list, such as "What can you help me create here?"
7. Confirm the assistant reply uses readable paragraphs, bullets or numbered lists, bold labels, and inline code styling instead of showing raw Markdown markers.
8. Refresh the page or switch boards and return.
9. Confirm chat history for that board loads from DB.

**What works now:** `GET /api/chat/thread`, `POST /api/chat`, persisted board-scoped chat threads, formatted assistant replies, tool execution cards, canvas refresh after successful tool calls.

---

## Flow 13 - Assistant tools

**Where:** `/`, assistant panel

The assistant has access to these implemented tools:

| Tool                    | What it does                                              |
| ----------------------- | --------------------------------------------------------- |
| `create_board`          | Creates a board in the workspace                          |
| `create_sub_board`      | Creates a child board                                     |
| `add_canvas_item`       | Adds an item to the active board                          |
| `update_canvas_item`    | Updates position, size, or content                        |
| `delete_canvas_item`    | Soft-deletes an item with confirmation                    |
| `summarize_board`       | Reads board/items for a summary response                  |
| `list_canvas_items`     | Lists item IDs/types/positions/content                    |
| `organize_board`        | Rearranges all items into a grid, row, or column layout   |
| `duplicate_board`       | Copies a board and all its items into a new board         |
| `rollback_canvas_change`| Restores a soft-deleted item from a prior delete call     |
| `create_task`           | Creates a task                                            |
| `list_tasks`            | Lists open tasks                                          |
| `create_reminder`       | Creates a reminder (supports daily/weekly/monthly/yearly recurrence) |
| `list_reminders`        | Lists scheduled reminders                                 |
| `update_memory`         | Appends a board summary to MEMORY.md for long-term retention |

**Try:** "Summarize this board", "Organize this board into a grid", "Duplicate this board", "Undo that deletion", "Remind me every Monday at 9am", or "Remember this board."

**What works now:** tools execute against DB-backed workspace data and render execution cards.

---

## Flow 14 - Widget library preview

**Where:** `/`, left sidebar or mobile board drawer

1. Select a board.
2. Scroll to **Widgets**.
3. Confirm cards exist for Task List and Kanban.
4. Click a widget.
5. Confirm a preview modal opens with name, description, mini preview, Cancel, and Add to board.
6. Click **Cancel** and confirm nothing is created.
7. Reopen the preview and click **Add to board**.
8. Confirm the widget appears on the canvas and persists after refresh.

**What works now:** preview-before-insert and POST to `/api/canvas-items` only after confirmation.

**Known limitations:** markdown reader, rich text editor, reminders widget, and widget version history are not implemented.

---

## Flow 15 - Sandboxed HTML widget confirmation gate

**Where:** `/`, canvas with an `html_widget` item

1. Confirm the widget shows a run confirmation screen before iframe content executes.
2. Click **Run**.
3. Confirm the iframe renders its `srcDoc`.
4. Inspect attributes and confirm `sandbox="allow-scripts"` and `referrerPolicy="no-referrer"`.

**What works now:** confirmation gate, sandboxed iframe renderer, no same-origin permission.

---

## Flow 16 - Tasks page

**Where:** `/tasks`

1. Navigate to `/tasks`.
2. Click **New task**.
3. Fill title, priority, due date, and optional board association.
4. Click **Add task**.
5. Confirm the task appears.
6. Click **Mark complete**.
7. Refresh and confirm completed tasks remain hidden.

**What works now:** real tasks from DB, create via `POST /api/tasks`, mark-complete via `PATCH /api/tasks/[id]`.

---

## Flow 17 - Core files editor

**Where:** `/core`

1. Navigate to `/core`.
2. Confirm the page lists whitelisted agent-core files.
3. Click a filename to jump to its editor section.
4. Edit a file and click **Save**.
5. Reload and confirm changes persist.
6. Attempting to save a non-whitelisted file should be rejected.

**What works now:** file read, server action save, whitelist, path traversal protection, `revalidatePath`.

**Known limitations:** no diff preview or version history.

---

## Flow 18 - Telegram user-owned bot smoke test

**Where:** deployed public HTTPS app, `/settings`, BotFather, and Telegram

1. Set `APP_URL` to the deployed HTTPS URL and configure `APP_ENCRYPTION_KEY`.
2. In Telegram, open BotFather and run `/newbot`.
3. Copy the token, open `/settings`, paste it, and click **Connect token**.
4. Send `/start` to the new bot.
5. Confirm the bot replies with `Your Telegram ID is <id>...`.
6. Paste that ID in `/settings` and click **Connect ID**.
7. Send `/boards` and confirm the bot replies with recent boards.
8. Send `/tasks`, `/newboard Test`, and `/addnote Test: hello`.
9. Confirm Telegram replies and the web app reflects created data.

**What works now:** per-user BotFather token connection, encrypted token storage, bot-specific webhook route, `/start` ID handshake, command dispatch, Telegram `sendMessage` replies.

**Known limitations:** live verification requires a real bot token and public HTTPS URL. `/remind`, `/summarize`, photo/file capture, and voice transcription are not implemented.

---

## Flow 19 - Navigation between routes

| From     | To       | Method                                    |
| -------- | -------- | ----------------------------------------- |
| `/`      | `/tasks` | Mobile bottom nav Tasks tab or direct URL |
| `/`      | `/core`  | Desktop Core link or mobile Core tab      |
| `/core`  | `/`      | Board link in `/core` header              |
| `/tasks` | `/`      | Board link in header or direct URL        |
| Any page | `/login` | Sign out from board explorer              |

**What works now:** routes render, navigation links are wired, sign-out clears the session.

---

## Flows not yet testable

- `organize_board`, `duplicate_board`, and assistant `rollback_canvas_change`.
- Telegram `/remind`, `/summarize`, file/photo capture, and voice transcription.
- OAuth or magic link auth.
- Production deployment config.
- Full E2E suite.
