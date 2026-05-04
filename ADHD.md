# ADHD Quick Reference

Fast context restoration for this project. Read this first when starting a session.

---

## What is this?

A **mobile-first AI whiteboard app**. Users chat with an AI assistant that creates boards, adds canvas items (sticky notes, Kanban, task lists, etc.), manages tasks and reminders, and persists everything to Postgres.

---

## Current state - P1 in progress

- Auth works (signup -> auto-onboarding board -> login).
- Canvas persists (move, resize, edit, delete, copy, click-to-create).
- Canvas has client undo for the last move/resize states with `Ctrl+Z` / `Cmd+Z`.
- Chat history persists to DB (survives page refresh, loads on board switch).
- Real LLM via OpenRouter, with local stub fallback.
- Board templates: Project Kickoff, Brainstorm Session, Weekly Review.
- Server-side board search with 300ms debounce.
- Widgets: Task List, Notes, Kanban, with preview before insertion.
- Telegram webhook route exists and can be registered with `npm run telegram:webhook`.
- Cards have shadow/depth. Canvas has dot+grid texture.

**Still missing (P1):** board links as canvas items, `organize_board`, assistant `rollback_canvas_change`, Telegram `/remind` and `/summarize`, widget version history, and more widgets.

---

## Start the app in 3 steps

```bash
docker compose up -d postgres   # 1. database
npm install                     # 2. deps (skip if done)
npm run dev                     # 3. -> http://localhost:3000
```

---

## Critical env vars (`.env.local` overrides `.env`)

| Var                       | Value                                     |
| ------------------------- | ----------------------------------------- |
| `DATABASE_URL`            | Local Postgres URL on port 5444           |
| `AUTH_SECRET`             | Required for NextAuth                     |
| `LLM_PROVIDER`            | `openrouter` (real LLM) or `local` (stub) |
| `OPENROUTER_API_KEY`      | From openrouter.ai when using OpenRouter  |
| `OPENROUTER_MODEL`        | Any supported OpenRouter model            |
| `APP_URL`                 | Public app URL for Telegram webhook setup |
| `TELEGRAM_BOT_TOKEN`      | BotFather token for Telegram              |
| `TELEGRAM_WEBHOOK_SECRET` | Optional Telegram webhook secret token    |

---

## Key routes

| URL                     | What                                       |
| ----------------------- | ------------------------------------------ |
| `/signup`               | Create account -> auto-seeds Welcome Board |
| `/login`                | Sign in                                    |
| `/`                     | Main app (boards + canvas + AI chat)       |
| `/tasks`                | Task center                                |
| `/core`                 | Edit assistant core files                  |
| `/api/telegram/webhook` | Telegram webhook receiver                  |

---

## Key files

| File                                    | Why you care                                     |
| --------------------------------------- | ------------------------------------------------ |
| `SESSION_HANDOFF.md`                    | Start here: what last session did + known issues |
| `CURRENT_STATUS.md`                     | Full app state inventory                         |
| `TODO.md`                               | Backlog: pick the next P1 item                   |
| `src/app/api/chat/route.ts`             | LLM + tool call loop                             |
| `src/server/assistant/`                 | Assistant tool files                             |
| `src/app/components/BoardCanvas.tsx`    | Canvas with persistence and undo                 |
| `src/app/components/WidgetLibrary.tsx`  | Widget picker + preview-before-insert            |
| `src/app/components/AssistantPanel.tsx` | Chat UI + persisted history loading              |
| `src/app/api/telegram/webhook/route.ts` | Telegram webhook adapter                         |
| `src/server/telegram/commands.ts`       | Telegram command handling                        |
| `scripts/register-telegram-webhook.ts`  | One-time Telegram webhook registration           |
| `src/server/onboarding.ts`              | Welcome Board seed                               |
| `src/server/board-templates.ts`         | 3 reusable board templates                       |
| `prisma/schema.prisma`                  | DB schema                                        |
| `src/lib/session.ts`                    | `requireSession()` used by API routes            |

---

## Run checks before committing

```bash
npm run lint && npm run typecheck && npm test -- --run && npm run build
```

Useful extras:

```bash
npm run docs:check
npm run telegram:webhook
```

Format issues: `npx prettier --write .`

---

## Next tasks (P1)

1. Board links as canvas items.
2. `organize_board` assistant tool.
3. Assistant `rollback_canvas_change` tool.
4. Telegram `/remind` and `/summarize`.
5. Markdown reader / rich text / reminders widgets.

---

## Agent workflow (short version)

1. Read `SESSION_HANDOFF.md` -> `CURRENT_STATUS.md` -> `TODO.md`.
2. Pick the first incomplete P1 task unless the user asked for something specific.
3. Make the smallest correct change.
4. Run relevant checks.
5. Update docs, `CURRENT_STATUS.md`, and `SESSION_HANDOFF.md`.
