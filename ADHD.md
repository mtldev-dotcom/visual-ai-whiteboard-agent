# ADHD Quick Reference

Fast context restoration for this project. Read this first when starting a session.

---

## What is this?

A **mobile-first AI whiteboard app**. Users chat with an AI assistant that creates boards, adds canvas items (sticky notes, Kanban, task lists, etc.), manages tasks and reminders, and persists everything to Postgres.

---

## Current state - P1 complete, admin done

- Auth works (signup -> auto-onboarding board -> login). Roles: `USER` | `ADMIN`.
- Canvas persists (move, resize, edit, delete, copy, click-to-create).
- Canvas has client undo for the last move/resize states with `Ctrl+Z` / `Cmd+Z`.
- Toolbar tools now create native whiteboard items: pen strokes, arrows, shape variants, frames, text, sticky notes, and task lists.
- Board links render as `board_link` canvas items and navigate to same-workspace boards.
- Text/sticky/shape/frame items edit inline instead of opening the old centered edit modal.
- Chat history persists to DB (survives page refresh, loads on board switch).
- Real LLM via OpenRouter, with local stub fallback.
- Board templates: Project Kickoff, Brainstorm Session, Weekly Review.
- Server-side board search with 300ms debounce.
- Widgets: Task List, Kanban, Markdown Reader, Rich Text, and Reminders, with preview before insertion.
- Assistant-generated safe HTML widgets are stored with versioned source and can be rolled back.
- Telegram bots are connected from `/settings` with user-owned BotFather tokens and bot-specific webhooks.
- Cards have shadow/depth. Canvas has dot+grid texture.
- **Admin dashboard** at `/admin`: user management, API keys, core file editor, assistant debugger, audit log.

**Still missing (P2):** Telegram `/remind` + `/summarize`, canvas minimap, realtime collaboration, OAuth.

---

## Start the app in 3 steps

```bash
docker compose up -d postgres   # 1. database
npm install                     # 2. deps (skip if done)
npm run dev                     # 3. -> http://localhost:3000
```

---

## Critical env vars (`.env.local` overrides `.env`)

| Var                  | Value                                     |
| -------------------- | ----------------------------------------- |
| `DATABASE_URL`       | Local Postgres URL on port 5444           |
| `AUTH_SECRET`        | Required for NextAuth                     |
| `LLM_PROVIDER`       | `openrouter` (real LLM) or `local` (stub) |
| `OPENROUTER_API_KEY` | From openrouter.ai when using OpenRouter  |
| `OPENROUTER_MODEL`   | Any supported OpenRouter model            |
| `APP_URL`            | Public app URL for Telegram webhook setup |
| `APP_ENCRYPTION_KEY` | Required to encrypt user-owned bot tokens |

---

## Key routes

| URL                                    | What                                          |
| -------------------------------------- | --------------------------------------------- |
| `/signup`                              | Create account -> auto-seeds Welcome Board    |
| `/login`                               | Sign in                                       |
| `/`                                    | Main app (boards + canvas + AI chat)          |
| `/tasks`                               | Task center                                   |
| `/core`                                | Edit assistant core files                     |
| `/admin`                               | Admin dashboard (ADMIN role required)         |
| `/api/telegram/webhook/[connectionId]` | Bot-specific Telegram webhook receiver        |

---

## Key files

| File                                                   | Why you care                                     |
| ------------------------------------------------------ | ------------------------------------------------ |
| `SESSION_HANDOFF.md`                                   | Start here: what last session did + known issues |
| `CURRENT_STATUS.md`                                    | Full app state inventory                         |
| `TODO.md`                                              | Backlog: pick the next P1 item                   |
| `src/app/api/chat/route.ts`                            | LLM + tool call loop                             |
| `src/server/assistant/`                                | Assistant tool files                             |
| `src/app/components/BoardCanvas.tsx`                   | Canvas with persistence and undo                 |
| `src/app/components/WidgetLibrary.tsx`                 | Widget picker + preview-before-insert            |
| `src/app/components/AssistantPanel.tsx`                | Chat UI + persisted history loading              |
| `src/app/api/telegram/webhook/[connectionId]/route.ts` | Telegram webhook adapter                         |
| `src/server/telegram/commands.ts`                      | Telegram command handling                        |
| `src/server/onboarding.ts`                             | Welcome Board seed                               |
| `src/server/board-templates.ts`                        | 3 reusable board templates                       |
| `prisma/schema.prisma`                                 | DB schema (17 models, UserRole enum, ApiKey)     |
| `src/lib/session.ts`                                   | `requireSession()` used by API routes            |
| `src/lib/admin.ts`                                     | `requireAdmin()` used by all /api/admin routes   |
| `src/app/admin/`                                       | Admin dashboard UI pages                         |
| `scripts/create-admin.ts`                              | Seed admin user via CLI                          |

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

## Next tasks (P2)

1. Telegram `/remind` and `/summarize` commands.
2. Canvas minimap.
3. Realtime collaboration.
4. OAuth / magic link auth.

---

## Agent workflow (short version)

1. Read `SESSION_HANDOFF.md` -> `CURRENT_STATUS.md` -> `TODO.md`.
2. Pick the first incomplete P1 task unless the user asked for something specific.
3. Make the smallest correct change.
4. Run relevant checks.
5. Update docs, `CURRENT_STATUS.md`, and `SESSION_HANDOFF.md`.
