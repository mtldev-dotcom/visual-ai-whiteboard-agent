# Current Status

Last updated: 2026-05-04

## Stage

P0 complete + P1 in progress (7 of 10 done). App is production-ready with a growing set of AI tools, persistent chat, and a polished canvas UI.

## Current goal

Complete the remaining P1 items: undo/rollback (#8), widget preview (#9), Telegram webhook (#10).

## What exists

### Foundation
- Prisma schema — 13 models (User, Workspace, Board, CanvasItem, WidgetDefinition, WidgetInstance, CustomHtmlWidgetSource, Task, Reminder, TelegramLinkToken, TelegramAccount, AuditEvent, **ChatThread**, **ChatMessage**).
- All DB helpers in `src/db/`.
- Docker Compose Postgres on port 5444.

### Auth
- NextAuth.js v4 credentials (email + password). Signup at `/signup`, login at `/login`.
- JWT session with `userId` + `workspaceId`. Next.js 16 proxy guards all routes.
- `getOrCreateWorkspaceForUser` creates workspace on first login.
- **Onboarding board** auto-seeded on signup: Welcome Board with sticky note, notes, task list, and Kanban.

### Boards & Canvas
- `listBoardsForWorkspace`, `searchBoardsForWorkspace` (case-insensitive, limit 30).
- `BoardExplorer` — live create, server-side debounced search (300ms, spinner), board selection, **template picker** (LayoutTemplate icon).
- **3 board templates**: Project Kickoff, Brainstorm Session, Weekly Review.
- `BoardCanvas` — pan/zoom, drag-to-move, resize, select, floating action bar, mobile bottom sheet.
- Item types: text, sticky_note, notes, task_list, **kanban**, markdown, image, link, html_widget.
- Click-to-create via toolbar tools (V/H/T/S/N/K shortcuts).
- Edit modal, copy, delete with confirmation. Debounced PATCH on move/resize.
- **Card shadow system** — `--shadow-card` CSS var with multi-layer shadow + 1px inset ring. Cards float off the canvas in both light and dark mode.
- **Canvas texture** — 3-layer composite: dot-grid + horizontal lines + vertical lines (32px). Figma-style grid.

### AI Assistant
- OpenRouter LLM adapter (any model via `OPENROUTER_MODEL`). Falls back to local stub.
- **Persistent chat threads** — one `ChatThread` per board. Messages saved to DB after each turn. History loaded on board switch.
- **9 registered tools** in chat:
  - `create_board`, `create_sub_board`
  - `add_canvas_item`, `update_canvas_item`, `delete_canvas_item`
  - `summarize_board`, `list_canvas_items`
  - `create_task`, `list_tasks`, `create_reminder`, `list_reminders`
- Tool execution cards in chat UI (success/error/pending states).
- Canvas auto-refreshes after successful tool calls.

### API routes
`/api/auth/[...nextauth]`, `/api/auth/signup`, `/api/boards`, `/api/boards/[id]`, `/api/boards/from-template`, `/api/canvas-items`, `/api/canvas-items/[id]`, `/api/chat`, `/api/chat/thread`, `/api/tasks`, `/api/tasks/[id]`, `/api/workspace`

### UI/UX
- CSS design token system — `--bg-*`, `--text-*`, `--accent*`, `--border*`, `--shadow-*`, `--canvas-*`.
- Light/dark mode — persistent via localStorage, `ThemeProvider` context, `<html class="dark">`.
- Collapsible sidebars, compact 44px header, mobile slide-up drawers, bottom nav.
- Widget library: Task List, Notes, **Kanban**.
- `/tasks` — task center with create form, priority, dueDate, mark-complete.
- `/core` — markdown editor for assistant context files.
- Login/signup cards with CSS var styling.

## What does NOT exist yet

- Undo/rollback for canvas changes (P1 — next).
- Widget preview before insert (P1).
- Telegram live webhook (P1 — server handlers exist, webhook registration missing).
- `organize_board` tool (auto-layout).
- Canvas minimap / grouping / frames (P2).
- Realtime collaboration (P2).
- OAuth / magic link auth (P2).
- Production deployment config (P2).
- Chat message timestamps in UI.
- Full E2E test suite.

## Known risks

- `npm audit` reports moderate PostCSS and `@hono/node-server` advisories. Do not apply `--force`.
- `AUTH_SECRET=dev-auth-secret-replace-in-production` in `.env` — replace before any real deployment.
- Generated HTML widgets: sandbox + confirmation gate in place; do not relax.
- No CSRF protection on `/api/auth/signup` beyond bcrypt cost.
