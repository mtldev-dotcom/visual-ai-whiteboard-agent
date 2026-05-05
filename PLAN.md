# Remaining Work Plan

## P1 — Next 3 tasks (in order)

### Task 8: Undo/rollback for canvas changes — done

**File:** `src/app/components/BoardCanvas.tsx`

- Add `undoStack` ref: `{ id: string; x: number; y: number; width: number; height: number }[]` (max 20)
- Add `undoToast` state: `boolean` (show 3s pill)
- On `onPointerDown` for item drag (move + resize): capture **before** state into a local variable
- On `onPointerUp` for item drag: push the captured before-state onto `undoStack`
- Add `useEffect` for `keydown` → `Ctrl+Z` / `Cmd+Z`:
  - Skip if `document.activeElement` is `INPUT` or `TEXTAREA`
  - Pop stack → optimistic `setItems` update → `PATCH /api/canvas-items/[id]`
  - Set `undoToast = true`, auto-clear after 3s
- Render undo toast: small pill at top-center of canvas, `absolute top-3 left-1/2 -translate-x-1/2 z-20`

---

### Task 9: Widget preview before insert — done

**File:** `src/app/components/WidgetLibrary.tsx`

- On widget click: instead of immediately POSTing, set `previewWidget` state
- Render a small preview card (modal or inline panel) showing:
  - Widget name + description
  - Mini preview of what it looks like (static)
  - "Add to board" button → POST `/api/canvas-items` → call `onItemAdded`
  - "Cancel" button → clear preview state

---

### Task 10: Wire Telegram webhook — done

**File:** `src/app/api/telegram/webhook/route.ts`, `.env.example`

- Register the webhook URL via Telegram Bot API:
  `POST https://api.telegram.org/bot<TOKEN>/setWebhook?url=<APP_URL>/api/telegram/webhook/[connectionId]`
- Users connect BotFather tokens from `/settings`; tokens are encrypted with `APP_ENCRYPTION_KEY`.
- Test: connect token, send `/start`, paste returned ID, then send `/boards`.

---

## P1 — Remaining backlog items (after above)

| Item                                   | Location                                 |
| -------------------------------------- | ---------------------------------------- |
| `organize_board` AI tool (auto-layout) | `src/server/assistant/` + chat route     |
| Board links as canvas items            | canvas item type `board_link`            |
| Telegram `/remind` command             | `src/server/telegram/handlers.ts`        |
| Telegram `/summarize` command          | same                                     |
| Markdown reader widget                 | `WidgetLibrary` + `BoardCanvas` renderer |
| Rich text editor widget                | same                                     |

## P2 — Later

- Canvas minimap
- Grouping / frames
- Realtime collaboration
- OAuth / magic link auth
- Production deployment (Vercel + Railway)
- Analytics
- Chat message timestamps in UI
- Board-aware memory summaries
