# ADHD Quick Reference

Fast context restoration for this project. Read this first when starting a session.

---

## What is this?

A **mobile-first AI whiteboard app**. Users chat with an AI assistant that creates boards, adds canvas items (sticky notes, diagrams, widgets), manages tasks, and persists everything to a Postgres database.

---

## Current state — production-ready MVP

- Auth works (signup, login, JWT session).
- Canvas persists (move, resize, edit, delete, copy all save to DB).
- Real LLM works (OpenRouter via `openai` SDK).
- All API routes wired.
- 51 tests pass. Build passes.

**What's missing (P1):** chat history persistence, board search (DB), undo/rollback, `summarize_board` tool, Kanban widget, task/reminder assistant tools, Telegram live webhook, OAuth auth.

---

## Start the app in 3 steps

```bash
docker compose up -d postgres   # 1. database
npm install                     # 2. deps (skip if already done)
npm run dev                     # 3. app → http://localhost:3000
```

---

## Critical env vars (`.env.local`)

| Var | Value |
|-----|-------|
| `DATABASE_URL` | `postgresql://visual_whiteboard:visual_whiteboard_dev@localhost:5444/visual_whiteboard_ai` |
| `AUTH_SECRET` | Any long random string (`openssl rand -base64 32`) |
| `LLM_PROVIDER` | `openrouter` (real LLM) or `local` (stub, no key needed) |
| `OPENROUTER_API_KEY` | From [openrouter.ai](https://openrouter.ai) |
| `OPENROUTER_MODEL` | `anthropic/claude-3-haiku` (default) |

---

## Key routes

| URL | What |
|-----|------|
| `/signup` | Create account |
| `/login` | Sign in |
| `/` | Main app (boards + canvas + chat) |
| `/tasks` | Task center |
| `/core` | Edit assistant core files |

---

## Key files to know

| File | Why you care |
|------|-------------|
| `CURRENT_STATUS.md` | Live project state |
| `TODO.md` | Backlog — find the next task here |
| `SESSION_HANDOFF.md` | What the last session did |
| `src/app/api/chat/route.ts` | LLM + tool call loop |
| `src/server/assistant/llm.ts` | LLM adapter (local + OpenRouter) |
| `src/app/components/BoardCanvas.tsx` | Canvas with DB persistence |
| `src/app/components/AssistantPanel.tsx` | Chat UI → API |
| `src/lib/session.ts` | `requireSession()` used by all API routes |
| `prisma/schema.prisma` | DB schema |

---

## Run checks before committing

```bash
npm run lint && npm run typecheck && npm test -- --run && npm run format:check && npm run build
```

All five must pass. Format issues: `npx prettier --write .`

---

## Next recommended tasks (P1)

1. Set `OPENROUTER_API_KEY` in `.env.local` and walk through `docs/user-flow-guide.md` manually.
2. Pick one from `TODO.md`:
   - Persist chat threads (store messages in DB)
   - `summarize_board` tool
   - Board search (server-side)
   - Task creation assistant tool

---

## Agent workflow (short version)

1. Read `AGENTS.md`, `README.md`, `CURRENT_STATUS.md`, `SESSION_HANDOFF.md`, `TODO.md`.
2. Pick first incomplete P1 task.
3. Write a short plan before editing.
4. Make the smallest correct change.
5. Run all 5 checks.
6. Update `CURRENT_STATUS.md` + `SESSION_HANDOFF.md` + any affected docs.
