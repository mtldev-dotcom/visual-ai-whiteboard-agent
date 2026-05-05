# Manual QA Flows

**App stage:** Production-ready MVP (auth, real DB, OpenRouter LLM, all flows wired).

**Before testing:**

```bash
docker compose up -d postgres
npm run dev
```

Set `LLM_PROVIDER=openrouter` and `OPENROUTER_API_KEY` in `.env.local` for LLM flows.

## 1. Sign up and sign in

- [ ] Navigate to `http://localhost:3000` and confirm redirect to `/login`.
- [ ] Sign up with email and password, then confirm redirect to `/`.
- [ ] Sign out and sign back in with the same credentials.
- [ ] Wrong password shows an error and stays on `/login`.
- [ ] Unauthenticated `/tasks` redirects to `/login`.
- [ ] With `APP_SIGNUP=disable`, `/signup` disables creation and direct signup API calls return 403.

## 2. Create board from chat

- [ ] Open assistant panel or Chat tab on mobile.
- [ ] Ask: "Create a board for planning my week."
- [ ] Assistant calls `create_board`.
- [ ] Execution card appears with success status.
- [ ] New board appears in board explorer and persists after refresh.

## 3. Create board manually

- [ ] Click New board in board explorer.
- [ ] Board appears in sidebar immediately.
- [ ] Selecting the board shows an empty canvas.
- [ ] Board persists after refresh.

## 4. Add canvas item via assistant

- [ ] Select a board.
- [ ] Ask: "Add a sticky note about onboarding."
- [ ] Assistant calls `add_canvas_item`.
- [ ] Canvas refreshes and shows the new sticky note.
- [ ] Item persists after refresh.

## 5. Canvas item move and resize

- [ ] Drag a canvas item to a new position.
- [ ] Refresh and confirm the item remains there.
- [ ] Resize with the bottom-right handle.
- [ ] Refresh and confirm dimensions persist.
- [ ] Press Ctrl/Cmd+Z after move/resize and confirm the previous geometry is restored.

## 6. Whiteboard toolbar and item edit/copy/delete

- [ ] Select Pen, drag on the canvas, refresh, and confirm the stroke persists.
- [ ] Select Shape, choose rectangle/ellipse/diamond, drag-create each shape, refresh, and confirm they persist.
- [ ] Select Arrow, drag from start to end, refresh, and confirm it persists.
- [ ] Select Frame, drag-create a frame, refresh, and confirm it persists.
- [ ] Select Text or Sticky, click/drag on the canvas, and confirm inline editing starts without a centered modal.
- [ ] Select an inline-editable item, double-click or press Enter, change title/content inside the item, and save with check, blur, or Ctrl/Cmd+Enter.
- [ ] Content updates on canvas and persists after refresh.
- [ ] Click Copy and confirm a duplicate appears offset from the original.
- [ ] Click Delete, confirm the dialog, and verify the item does not reappear after refresh.
- [ ] Press `V`, `H`, `P`, `R`, `F`, `A`, `T`, `S`, `K`, `W`, `+`, and `-` outside inputs and confirm matching toolbar behavior.

## 7. Widget library wired

- [ ] Open widget library from sidebar, mobile board drawer, or the toolbar Widget button.
- [ ] Click Task List, confirm preview, then add it to the active board.
- [ ] Click Kanban, confirm preview, then add it to the active board.
- [ ] Both items persist after refresh.

## 8. Tasks page

- [ ] Navigate to `/tasks`.
- [ ] Create a task with title, priority, due date, and optional board.
- [ ] New task appears in the list.
- [ ] Mark complete and confirm the card disappears.
- [ ] Tasks persist after refresh.

## 9. Canvas item mobile bottom sheet

- [ ] Open at 390px width in DevTools device emulation.
- [ ] Tap a canvas item and confirm the bottom sheet slides up.
- [ ] Sheet shows item title and Edit / Copy / Refresh / Delete buttons where applicable.
- [ ] Edit starts inline editing for simple items without opening a centered modal.
- [ ] Delete shows confirmation.
- [ ] Close button dismisses the sheet.

## 10. Widget sandbox confirmation gate

- [ ] Add a sandboxed HTML item via assistant or direct data.
- [ ] Item shows confirmation screen with Run button.
- [ ] Click Run and confirm iframe renders content.
- [ ] Confirm iframe has `sandbox="allow-scripts"` with no `allow-same-origin`.

## 11. Core files editor

- [ ] Navigate to `/core`.
- [ ] Files listed: CORE.md, ASSISTANT.md, TOOLS.md, SKILLS.md, RULES.md, MEMORY.md.
- [ ] Edit and save a file.
- [ ] Reload and confirm content persists.
- [ ] Path traversal is rejected.

## 12. Mobile layout

- [ ] At 390px: single column, bottom nav visible.
- [ ] Board drawer opens and collapses via Boards toggle.
- [ ] Bottom nav Tasks navigates to `/tasks`.
- [ ] Bottom nav Core navigates to `/core`.
- [ ] At 1024px+: three-column layout, bottom nav hidden.

## 13. Security checks

- [ ] No `AUTH_SECRET` or API keys visible in browser network inspector.
- [ ] Accessing `/api/boards` without a session returns 401.
- [ ] Generated widget iframe has `sandbox="allow-scripts"` with no `allow-same-origin`.
- [ ] Delete tools require `confirmed: true` in tool input.
- [ ] Soft-deleted items do not reappear in board listings.

## 14. Sub-board creation

- [ ] Ask assistant to create a sub-board under an existing board.
- [ ] `create_sub_board` tool executes.
- [ ] Sub-board appears indented under parent in board explorer.
- [ ] Sub-board has its own empty canvas.

## 15. Board search filter

- [ ] Type in Search boards.
- [ ] Board list filters to matching names.
- [ ] Clearing the input restores the full list.

## 16. Telegram user-owned bot

- [ ] Ensure deployed app has public HTTPS `APP_URL` and `APP_ENCRYPTION_KEY`.
- [ ] Create a bot in BotFather and paste the token in `/settings`.
- [ ] Send `/start` to the bot and paste the returned Telegram ID in `/settings`.
- [ ] Send `/boards` and `/tasks`; bot replies with workspace data.
- [ ] Send `/newboard Test` and `/addnote Test: hello`; web app shows created data.
- [ ] Remove the bot and confirm later Telegram commands no longer execute.
