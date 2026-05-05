# Manual QA Flows

**App stage:** Production-ready MVP (auth, real DB, OpenRouter LLM, all flows wired).

**Before testing:**

```bash
docker compose up -d postgres
npm run dev
```

Set `LLM_PROVIDER=openrouter` and `OPENROUTER_API_KEY` in `.env.local` for LLM flows.

---

## 1. Sign up and sign in

- [ ] Navigate to `http://localhost:3000` — redirects to `/login`.
- [ ] Click "Sign up" link, fill email + password, submit.
- [ ] Redirected to `/` (workspace shell).
- [ ] Sign out and sign back in with same credentials.
- [ ] Wrong password → shows error, stays on `/login`.
- [ ] Unauthenticated request to `/tasks` → redirects to `/login`.
- [ ] With `APP_SIGNUP=disable`, `/signup` shows account creation disabled, `/login` hides "Create one", and direct `POST /api/auth/signup` returns 403.

## 2. Create board from chat

- [ ] Open assistant panel (right side or Chat tab on mobile).
- [ ] Ask: "Create a board for planning my week."
- [ ] Assistant calls `create_board` tool.
- [ ] Execution card appears with tool name, status "success", and summary.
- [ ] New board appears in the board explorer sidebar.
- [ ] Board persists after page refresh.

## 3. Create board manually

- [ ] Click "New board" in the board explorer.
- [ ] Board appears in sidebar immediately.
- [ ] Selecting the board shows an empty canvas.
- [ ] Board persists after refresh.

## 4. Add canvas item via assistant

- [ ] Select a board.
- [ ] Ask: "Add a sticky note about onboarding."
- [ ] Assistant calls `add_canvas_item`.
- [ ] Execution card appears.
- [ ] Canvas refreshes and shows the new sticky note.
- [ ] Item persists after refresh.

## 5. Canvas item move and resize

- [ ] Drag a canvas item to a new position.
- [ ] Refresh the page.
- [ ] Item is at the new position (PATCH was persisted).
- [ ] Resize via bottom-right handle.
- [ ] Refresh — resized dimensions persist.

## 6. Canvas item edit, copy, delete

- [ ] Select an item — click Edit → change title/content → Save.
- [ ] Content updates on canvas and persists after refresh.
- [ ] Click Copy — new item appears offset from original.
- [ ] Click Delete — confirmation dialog appears → confirm → item removed.
- [ ] Deleted item does not reappear after refresh.

## 7. Widget library wired

- [ ] Open widget library (scroll below board list in sidebar, or Widgets drawer on mobile).
- [ ] Click "Task List" — new task list item appears on the active board.
- [ ] Click "Kanban" — new Kanban item appears on the active board.
- [ ] Both items persist after refresh.

## 8. Tasks page

- [ ] Navigate to `/tasks`.
- [ ] Click "New task" — form expands.
- [ ] Fill title, priority, due date, optional board → click "Add task".
- [ ] New task card appears in the list.
- [ ] Click "Mark complete" on a task — card disappears.
- [ ] Tasks persist after refresh.

## 9. Canvas item mobile bottom sheet

- [ ] Open at ≤ 390px width (DevTools device emulation).
- [ ] Tap a canvas item — bottom sheet slides up.
- [ ] Sheet shows item title, and Edit / Copy / Ask AI / Delete buttons.
- [ ] Edit opens inline edit modal.
- [ ] Delete shows confirmation.
- [ ] Close button dismisses sheet.

## 10. Widget sandbox — confirmation gate

- [ ] Add a sandboxed HTML item (via assistant or directly).
- [ ] Item shows confirmation screen with "Run" button.
- [ ] Click Run — iframe renders content.
- [ ] Widget HTML cannot access parent window (`sandbox="allow-scripts"`, no `allow-same-origin`).

## 11. Core files editor

- [ ] Navigate to `/core`.
- [ ] Files listed: CORE.md, ASSISTANT.md, TOOLS.md, SKILLS.md, RULES.md, MEMORY.md.
- [ ] Each textarea is pre-filled with current file content.
- [ ] Edit and Save — content persists after reload.
- [ ] Path traversal not possible (only whitelisted filenames accepted).

## 12. Mobile layout

- [ ] At 390px: single column, bottom nav visible (Chat, Board, Widgets, Tasks, Core).
- [ ] Board drawer opens and collapses via "Boards" toggle.
- [ ] Bottom nav "Tasks" navigates to `/tasks`.
- [ ] Bottom nav "Core" navigates to `/core`.
- [ ] At 1024px+: three-column layout, bottom nav hidden.

## 13. Security checks

- [ ] No AUTH_SECRET or API keys visible in browser network inspector.
- [ ] Accessing `/api/boards` without a session returns 401.
- [ ] Generated widget iframe has `sandbox="allow-scripts"` with no `allow-same-origin`.
- [ ] Delete tools require `confirmed: true` in tool input.
- [ ] Soft-deleted items do not reappear in board listings.

## 14. Sub-board creation

- [ ] Ask assistant: "Create a sub-board called Q2 Planning under [board name]."
- [ ] `create_sub_board` tool executes.
- [ ] Sub-board appears indented under parent in board explorer.
- [ ] Sub-board has its own empty canvas.

## 15. Board search filter

- [ ] Type in the "Search boards" input.
- [ ] Board list filters to matching names in real time (client-side filter).
- [ ] Clearing the input restores the full list.

## 16. Telegram user-owned bot

- [ ] Ensure deployed app has public HTTPS `APP_URL` and `APP_ENCRYPTION_KEY`.
- [ ] In BotFather, run `/newbot` and copy the new token.
- [ ] Open `/settings`, paste the token, and click "Connect token".
- [ ] Send `/start` to the new bot.
- [ ] Bot replies with a Telegram ID.
- [ ] Paste that ID in `/settings` and click "Connect ID".
- [ ] Send `/boards` and `/tasks`; bot replies with workspace data.
- [ ] Send `/newboard Test` and `/addnote Test: hello`; web app shows the created board/note.
- [ ] Click "Remove bot"; later commands from Telegram no longer execute.
