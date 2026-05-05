# Remaining Work Plan

---

## Admin Dashboard (completed 2026-05-05)

Full admin dashboard at `/admin` with dark sidebar nav.

**How to create the first admin:**
```bash
npx tsx scripts/create-admin.ts <email> <password>
```

**Sections:** Dashboard stats · User management · API key management · Core file editor · AI assistant debugger · Audit log

**Key files:**
- `src/lib/admin.ts` — `requireAdmin()` guard
- `src/app/admin/` — all UI pages
- `src/app/api/admin/` — all API routes
- `src/middleware.ts` — `/admin` route protection
- `scripts/create-admin.ts` — seed script

---

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

| Item                                   | Location                             |
| -------------------------------------- | ------------------------------------ |
| `organize_board` AI tool (auto-layout) | `src/server/assistant/` + chat route |
| Telegram `/remind` command             | `src/server/telegram/handlers.ts`    |
| Telegram `/summarize` command          | same                                 |

Completed after PLAN.md P1 set:

- Board links as canvas items: `board_link` renders on the canvas, stores `content.targetBoardId`, and validates same-workspace targets.
- Phase 4 P1 widgets: Markdown Reader, Rich Text, and Reminders are available from the widget library and render on the canvas.
- Phase 5 P1 widgets: assistant-generated safe HTML widgets store versioned source and can be rolled back with `rollback_html_widget`.

## P2 — Later

- Canvas minimap
- Grouping
- Realtime collaboration
- OAuth / magic link auth
- Production deployment (Vercel + Railway)
- Analytics
- Chat message timestamps in UI
- Board-aware memory summaries
