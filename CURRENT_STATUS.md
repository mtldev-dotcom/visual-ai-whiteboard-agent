# Current Status

Last updated: 2026-05-05

## Stage

P1 complete. Admin dashboard fully implemented this session. All PLAN.md P1 items done including `organize_board`, `duplicate_board`, `rollback_canvas_change`, and the new admin system.

## Current goal

P2 backlog: Telegram `/remind` and `/summarize`, canvas minimap, realtime collaboration, OAuth, production deployment.

## What exists

### Foundation

- Prisma schema: 17 models (User, Workspace, Board, CanvasItem, WidgetDefinition, WidgetInstance, CustomHtmlWidgetSource, Task, Reminder, TelegramLinkToken, TelegramBotConnection, TelegramStartIdentity, TelegramAccount, AuditEvent, ChatThread, ChatMessage, **ApiKey**). `User` now has `UserRole` enum (`USER` | `ADMIN`).
- All DB helpers in `src/db/`.
- Docker Compose Postgres on port 5444.

### Auth

- NextAuth.js v4 credentials (email + password). Signup at `/signup`, login at `/login`.
- Signup can be disabled per environment with `APP_SIGNUP=disable`; login remains available and the signup API returns 403.
- JWT session with `userId`, `workspaceId`, and `role`. Next.js 16 middleware guards all routes.
- `getOrCreateWorkspaceForUser` creates workspace on first login.
- Onboarding board auto-seeded on signup: Welcome Board with sticky notes, task list, and Kanban.
- `src/lib/admin.ts` — `requireAdmin()` guard (403 if role ≠ ADMIN).
- `src/middleware.ts` — redirects unauthenticated `/admin/*` to login, non-admins to `/core`.
- Admin user created via: `npx tsx scripts/create-admin.ts <email> <password>`.

### Boards & Canvas

- `listBoardsForWorkspace`, `searchBoardsForWorkspace` (case-insensitive, limit 30).
- `BoardExplorer`: live create, server-side debounced search (300ms, spinner), board selection, template picker.
- 3 board templates: Project Kickoff, Brainstorm Session, Weekly Review.
- `BoardCanvas`: pan/zoom, drag-to-move, resize, select, floating action bar, mobile bottom sheet.
- Client undo for the last move/resize states with `Ctrl+Z` / `Cmd+Z`, optimistic PATCH rollback, and a 3-second toast.
- Item types: text, sticky_note, task_list, kanban, rich_text, reminders, markdown, image, link, board_link, html_widget, drawing, arrow, shape, frame.
- Board links render as structured `board_link` canvas items with `content.targetBoardId`; item creation validates that linked boards belong to the same workspace.
- Whiteboard toolbar tools: select, hand/pan, pen, shape variants, frame, arrow, text, sticky note, task list, widget focus, color palette, tidy, and zoom shortcuts.
- Text/sticky/shape/frame/notes use inline editing; centered edit modal is no longer used for simple items.
- Copy, delete with confirmation, drag-create gestures, and debounced PATCH on move/resize.
- Card shadow system and composite canvas grid texture.

### AI Assistant

- OpenRouter LLM adapter (any model via `OPENROUTER_MODEL`). Falls back to local stub.
- Persistent chat threads: one `ChatThread` per board. Messages saved to DB after each turn. History loaded on board switch.
- Final assistant responses after tool calls receive tool results as explicit grounding data, so board summaries use actual canvas item output instead of guessing from chat history.
- Runtime chat context includes current date/time, selected board ID, and instructions to use board query tools before answering questions about visible board contents.
- The chat route supports multi-step tool execution, so requests like "delete that note" can list items first, then call `delete_canvas_item`, then respond only after the write tool succeeds.
- Registered chat tools:
  - `create_board`, `create_sub_board`
  - `add_canvas_item`, `update_canvas_item`, `delete_canvas_item`
  - `summarize_board`, `list_canvas_items`
  - `create_task`, `list_tasks`, `create_reminder`, `list_reminders`
  - `generate_html_widget`, `rollback_html_widget`
- Tool execution cards in chat UI (success/error/pending states).
- Assistant replies render Markdown-style structure in chat bubbles: paragraphs, headings, bullet lists, numbered lists, bold text, and inline code.
- Canvas auto-refreshes after successful tool calls.
- Assistant board/canvas tools verify workspace ownership before reading or mutating boards/items.

### Admin Dashboard (`/admin`)

Full admin dashboard at `/admin` with dark sidebar nav. All routes gated by `requireAdmin()`.

- `/admin` — stat cards (users, API keys, boards, workspaces, audit events)
- `/admin/users` — create, promote/demote, delete users
- `/admin/api-keys` — generate (shows raw key once), revoke API keys
- `/admin/core-files` — in-browser editor for all `docs/agent-core/*.md` files
- `/admin/assistant` — test AI assistant with full tool call trace
- `/admin/audit` — paginated audit event log with filters

### API routes

`/api/auth/[...nextauth]`, `/api/auth/signup`, `/api/boards`, `/api/boards/[id]`, `/api/boards/from-template`, `/api/canvas-items`, `/api/canvas-items/[id]`, `/api/chat`, `/api/chat/thread`, `/api/health`, `/api/tasks`, `/api/tasks/[id]`, `/api/telegram/account`, `/api/telegram/bot`, `/api/telegram/webhook`, `/api/telegram/webhook/[connectionId]`, `/api/workspace`, `/api/admin/stats`, `/api/admin/users`, `/api/admin/users/[id]`, `/api/admin/api-keys`, `/api/admin/api-keys/[id]`, `/api/admin/core-files`, `/api/admin/core-files/[filename]`, `/api/admin/assistant/debug`, `/api/admin/audit`

### Deployment

- Dockerfile-based deploy is ready for Dokploy test deployment.
- Deploy image uses Node.js 22 Debian slim with OpenSSL for Prisma.
- Docker build generates the Prisma client in the dependency stage and copies it into the Next.js builder stage before `next build`.
- Runtime image includes `docs/agent-core` so assistant chat can load Markdown core context in production.
- Container start runs `prisma migrate deploy` before `next start -H 0.0.0.0`.
- Public health check exists at `/api/health`.
- Dokploy/Hetzner guide: `docs/deployment/DOKPLOY_HETZNER.md`.

### UI/UX

- CSS design token system: `--bg-*`, `--text-*`, `--accent*`, `--border*`, `--shadow-*`, `--canvas-*`.
- Light/dark mode: persistent via localStorage, `ThemeProvider` context, `<html class="dark">`.
- Collapsible sidebars, compact 44px header, mobile slide-up drawers, bottom nav.
- Widget library: Task List, Kanban, Markdown Reader, Rich Text, and Reminders, with preview modal before insertion.
- Assistant can generate safe static HTML widgets; generated source is stored in versioned `CustomHtmlWidgetSource` records and can be rolled back with `rollback_html_widget`.
- `/tasks`: task center with create form, priority, dueDate, mark-complete.
- `/core`: markdown editor for assistant context files.
- Login/signup cards with CSS var styling.

### Telegram

- User-owned BotFather bot token setup from `/settings`.
- Bot tokens are validated with Telegram `getMe`, encrypted at rest with `APP_ENCRYPTION_KEY`, and registered with per-bot webhook secrets.
- `/start` on the connected bot records a short-lived Telegram identity and replies with the Telegram ID to paste into Settings.
- Telegram account linking now requires the user to paste that returned ID and click **Connect ID**.
- Server command handlers for `/boards`, `/tasks`, `/newboard`, and `/addnote`.
- `POST /api/telegram/webhook/[connectionId]` receives message updates, validates the bot-specific Telegram secret header, dispatches commands, and replies through Telegram `sendMessage`.

### Documentation

- `ADHD.md` is up to date as the fast project reference.
- `docs/user-flow-guide.md` is up to date as the manual testing reference for current implemented flows.

## What does NOT exist yet

- Telegram `/remind` and `/summarize`.
- Telegram photo/file capture and voice transcription.
- Canvas minimap / grouping (P2).
- Realtime collaboration (P2).
- OAuth / magic link auth (P2).
- Production deployment config (P2).
- Chat message timestamps in UI.
- Full E2E test suite.

## Known risks

- Telegram webhook was built and compiled, but live bot delivery still needs a public HTTPS `APP_URL`, a configured `APP_ENCRYPTION_KEY`, and a real BotFather token connected from `/settings`.
- `npm audit` reports moderate PostCSS and `@hono/node-server` advisories. Do not apply `--force`.
- `AUTH_SECRET=dev-auth-secret-replace-in-production` in `.env`: replace before any real deployment.
- Generated HTML widgets: sandbox + confirmation gate in place; do not relax.
- No CSRF protection on `/api/auth/signup` beyond bcrypt cost.
