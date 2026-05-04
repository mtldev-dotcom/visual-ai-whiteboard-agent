# ADHD Quick Reference

Fast context restoration for this project. Read this first when starting a session.

---

## What is this?

A **mobile-first AI whiteboard app**. Users chat with an AI assistant that creates boards, adds canvas items (sticky notes, Kanban, task lists, etc.), manages tasks, and persists everything to Postgres.

---

## Current state — P1 in progress

- Auth works (signup → auto-onboarding board → login).
- Canvas persists (move, resize, edit, delete, copy, click-to-create).
- Chat history persists to DB (survives page refresh, loads on board switch).
- Real LLM (OpenRouter). 9 AI tools registered.
- Board templates: Project Kickoff, Brainstorm, Weekly Review.
- Server-side board search (300ms debounced).
- Kanban widget live.
- Cards have shadow/depth. Canvas has dot+grid texture.

**Still missing (P1):** undo/rollback, widget preview, Telegram live webhook.

---

## Start the app in 3 steps

```bash
docker compose up -d postgres   # 1. database
npm install                     # 2. deps (skip if done)
npm run dev                     # 3. → http://localhost:3000
```

---

## Critical env vars (`.env.local` overrides `.env`)

| Var | Value |
|-----|-------|
| `LLM_PROVIDER` | `openrouter` (real LLM) or `local` (stub) |
| `OPENROUTER_API_KEY` | From openrouter.ai |
| `OPENROUTER_MODEL` | `deepseek/deepseek-v3.2` (currently set) |

Everything else (`DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`) is in `.env` with dev defaults.

---

## Key routes

| URL | What |
|-----|------|
| `/signup` | Create account → auto-seeds Welcome Board |
| `/login` | Sign in |
| `/` | Main app (boards + canvas + AI chat) |
| `/tasks` | Task center |
| `/core` | Edit assistant core files |

---

## Key files

| File | Why you care |
|------|-------------|
| `SESSION_HANDOFF.md` | **Start here** — what last session did + interrupted work |
| `CURRENT_STATUS.md` | Full app state inventory |
| `TODO.md` | Backlog — pick the next P1 item |
| `src/app/api/chat/route.ts` | LLM + tool call loop |
| `src/server/assistant/` | All tool files (board, canvas, query, task tools) |
| `src/app/components/BoardCanvas.tsx` | Canvas with full persistence |
| `src/app/components/AssistantPanel.tsx` | Chat UI + history loading |
| `src/server/onboarding.ts` | Welcome Board seed (called on signup) |
| `src/server/board-templates.ts` | 3 reusable board templates |
| `prisma/schema.prisma` | DB schema (13 models) |
| `src/lib/session.ts` | `requireSession()` used by all API routes |

---

## Run checks before committing

```bash
npm run lint && npm run typecheck && npm test -- --run && npm run build
```

Format issues: `npx prettier --write .`

---

## Next tasks (P1 — in order)

1. **Undo/rollback** — see `SESSION_HANDOFF.md` for the exact implementation plan (resume from #8).
2. **Widget preview before insert** — show a preview card before POSTing to `/api/canvas-items`.
3. **Telegram webhook** — register the webhook URL; server-side handlers already exist.

---

## Agent workflow (short version)

1. Read `SESSION_HANDOFF.md` → `CURRENT_STATUS.md` → `TODO.md`.
2. Pick first incomplete P1 task (resume interrupted work from handoff first).
3. Make the smallest correct change.
4. Run all 4 checks (lint, typecheck, test, build).
5. Update `CURRENT_STATUS.md` + `SESSION_HANDOFF.md`.
