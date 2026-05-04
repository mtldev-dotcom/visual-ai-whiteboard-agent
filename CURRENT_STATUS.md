# Current Status

Last updated: 2026-05-04

## Stage

P0 complete + P1 in progress. The PLAN.md P1 set is complete: undo/rollback, widget preview, and Telegram webhook wiring are implemented.

## Current goal

Continue the remaining P1 backlog beyond PLAN.md: board links, `organize_board`, `rollback_canvas_change`, Telegram `/remind` and `/summarize`, and additional widgets.

## What exists

### Foundation

- Prisma schema: 13 models (User, Workspace, Board, CanvasItem, WidgetDefinition, WidgetInstance, CustomHtmlWidgetSource, Task, Reminder, TelegramLinkToken, TelegramAccount, AuditEvent, ChatThread, ChatMessage).
- All DB helpers in `src/db/`.
- Docker Compose Postgres on port 5444.

### Auth

- NextAuth.js v4 credentials (email + password). Signup at `/signup`, login at `/login`.
- JWT session with `userId` + `workspaceId`. Next.js 16 proxy guards all routes.
- `getOrCreateWorkspaceForUser` creates workspace on first login.
- Onboarding board auto-seeded on signup: Welcome Board with sticky note, notes, task list, and Kanban.

### Boards & Canvas

- `listBoardsForWorkspace`, `searchBoardsForWorkspace` (case-insensitive, limit 30).
- `BoardExplorer`: live create, server-side debounced search (300ms, spinner), board selection, template picker.
- 3 board templates: Project Kickoff, Brainstorm Session, Weekly Review.
- `BoardCanvas`: pan/zoom, drag-to-move, resize, select, floating action bar, mobile bottom sheet.
- Client undo for the last move/resize states with `Ctrl+Z` / `Cmd+Z`, optimistic PATCH rollback, and a 3-second toast.
- Item types: text, sticky_note, notes, task_list, kanban, markdown, image, link, html_widget.
- Click-to-create via toolbar tools (V/H/T/S/N/K shortcuts).
- Edit modal, copy, delete with confirmation. Debounced PATCH on move/resize.
- Card shadow system and composite canvas grid texture.

### AI Assistant

- OpenRouter LLM adapter (any model via `OPENROUTER_MODEL`). Falls back to local stub.
- Persistent chat threads: one `ChatThread` per board. Messages saved to DB after each turn. History loaded on board switch.
- Registered chat tools:
  - `create_board`, `create_sub_board`
  - `add_canvas_item`, `update_canvas_item`, `delete_canvas_item`
  - `summarize_board`, `list_canvas_items`
  - `create_task`, `list_tasks`, `create_reminder`, `list_reminders`
- Tool execution cards in chat UI (success/error/pending states).
- Canvas auto-refreshes after successful tool calls.

### API routes

`/api/auth/[...nextauth]`, `/api/auth/signup`, `/api/boards`, `/api/boards/[id]`, `/api/boards/from-template`, `/api/canvas-items`, `/api/canvas-items/[id]`, `/api/chat`, `/api/chat/thread`, `/api/tasks`, `/api/tasks/[id]`, `/api/telegram/webhook`, `/api/workspace`

### UI/UX

- CSS design token system: `--bg-*`, `--text-*`, `--accent*`, `--border*`, `--shadow-*`, `--canvas-*`.
- Light/dark mode: persistent via localStorage, `ThemeProvider` context, `<html class="dark">`.
- Collapsible sidebars, compact 44px header, mobile slide-up drawers, bottom nav.
- Widget library: Task List, Notes, Kanban, with preview modal before insertion.
- `/tasks`: task center with create form, priority, dueDate, mark-complete.
- `/core`: markdown editor for assistant context files.
- Login/signup cards with CSS var styling.

### Telegram

- Account-link token DB model and secure consume flow.
- Server command handlers for `/boards`, `/tasks`, `/newboard`, and `/addnote`.
- `POST /api/telegram/webhook` receives message updates, validates `TELEGRAM_WEBHOOK_SECRET` when configured, links `/start <token>`, dispatches commands, and replies through Telegram `sendMessage`.
- `npm run telegram:webhook` registers `APP_URL/api/telegram/webhook` with Telegram.

### Documentation

- `ADHD.md` is up to date as the fast project reference.
- `docs/user-flow-guide.md` is up to date as the manual testing reference for current implemented flows.

## What does NOT exist yet

- `organize_board` tool (auto-layout).
- Assistant `rollback_canvas_change` tool.
- Board links as canvas items.
- Telegram `/remind` and `/summarize`.
- Telegram photo/file capture and voice transcription.
- Widget version history / generated-widget rollback.
- Canvas minimap / grouping / frames (P2).
- Realtime collaboration (P2).
- OAuth / magic link auth (P2).
- Production deployment config (P2).
- Chat message timestamps in UI.
- Full E2E test suite.

## Known risks

- Telegram webhook was built and compiled, but live bot delivery still needs a public HTTPS `APP_URL`, `TELEGRAM_BOT_TOKEN`, and optional `TELEGRAM_WEBHOOK_SECRET`.
- `npm audit` reports moderate PostCSS and `@hono/node-server` advisories. Do not apply `--force`.
- `AUTH_SECRET=dev-auth-secret-replace-in-production` in `.env`: replace before any real deployment.
- Generated HTML widgets: sandbox + confirmation gate in place; do not relax.
- No CSRF protection on `/api/auth/signup` beyond bcrypt cost.
