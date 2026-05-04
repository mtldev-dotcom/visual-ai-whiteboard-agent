# Current Status

Last updated: 2026-05-04

## Stage

Phases 0–9 P0 complete. Production-ready MVP wired end-to-end.

## Current goal

Shipped. App is production-ready with auth, real DB-backed UI, OpenRouter LLM, and all core flows working.

## What exists

- Everything from the previous foundation (Phases 0–8 P0).
- **Auth:** NextAuth.js v4 credentials (email + password). Signup at `/signup`, login at `/login`. JWT session with `userId` + `workspaceId`. Next.js 16 proxy guards all routes.
- **Workspace per user:** `getOrCreateWorkspaceForUser` creates a workspace on first login and reuses it on subsequent logins.
- **Real boards UI:** home page loads boards from DB via `listBoardsForWorkspace`. Board explorer with live create, search filter, and board selection.
- **Real canvas persistence:** `BoardCanvas` loads items from `/api/boards/[id]`, debounced PATCH on move/resize, DELETE with confirmation dialog, inline edit modal with PATCH save, copy item.
- **Real assistant chat:** `AssistantPanel` POSTs to `/api/chat`, executes tool calls against real tool registry, renders LLM responses and tool execution cards. Canvas auto-refreshes after successful tool calls.
- **OpenRouter LLM adapter:** `OpenRouterLlmAdapter` using `openai` SDK with OpenRouter `baseURL`. Activated via `LLM_PROVIDER=openrouter` + `OPENROUTER_API_KEY`. Falls back to local stub if not configured.
- **Widget library wired:** clicking Task List or Notes widget POSTs to `/api/canvas-items` and adds the item to the active board.
- **Real tasks page:** loads tasks from DB, create-task form with title/priority/dueDate/board, mark-complete button.
- **API routes:** `/api/chat`, `/api/boards`, `/api/boards/[id]`, `/api/canvas-items`, `/api/canvas-items/[id]`, `/api/tasks`, `/api/tasks/[id]`, `/api/workspace`, `/api/auth/[...nextauth]`, `/api/auth/signup`.
- **Empty/loading states:** canvas loading spinner, empty board message, empty boards list message, no-board-selected message.
- **User flow guide:** `docs/user-flow-guide.md` with 15 testable flows.

## What does not exist yet

- P1 features: board search persistence, undo/rollback, canvas minimap, grouping/frames, persist chat threads, summarize/organize/duplicate board tools, Kanban widget, markdown reader/rich text editor widgets, widget generation via assistant, task/reminder assistant tools, Telegram webhook, auth session refresh on token expiry.
- Realtime collaboration (P2).
- Auth: no OAuth providers, no email magic link, no "forgot password".
- No production deployment config (no Vercel/Railway config yet).

## Recommended next task

Set `LLM_PROVIDER=openrouter` and `OPENROUTER_API_KEY` in `.env.local`, then manually run the flows in `docs/user-flow-guide.md` to verify end-to-end.

## Known risks

- `npm audit` reports moderate PostCSS and `@hono/node-server` advisories through Next.js and Prisma. Do not apply `npm audit fix --force`.
- Generated HTML widgets create security risk. Sandbox and confirmation gate are in place; do not relax them.
- `AUTH_SECRET` must be a strong random value in production. The `.env` placeholder `dev-auth-secret-replace-in-production` must be replaced.
