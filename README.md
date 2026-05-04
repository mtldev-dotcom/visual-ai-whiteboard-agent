# Visual AI Whiteboard Assistant

A mobile-first AI workspace where users chat with an assistant that can think visually, create boards, build mini-apps, manage tasks, and organize work through a live canvas and structured tool calling.

## One-sentence pitch

Chat with an AI that builds your workspace around you — boards, sticky notes, diagrams, tasks, and custom widgets, all persisted in a live canvas.

## What is inside this repo

- `AGENTS.md` — root operating contract for all coding agents.
- `TODO.md` — execution backlog.
- `CURRENT_STATUS.md` — live project state, updated every session.
- `SESSION_HANDOFF.md` — latest session summary.
- `docs/product/` — product vision, PRD, MVP scope, user flows, mobile UX.
- `docs/architecture/` — system overview, data model, canvas engine, assistant tools, widget runtime, Telegram integration, security.
- `docs/implementation/` — phases, pipeline, definition of done.
- `docs/agent-core/` — Markdown core files for assistant personality, tools, skills, rules, memory.
- `docs/qa/` — testing strategy and manual QA flows.
- `specs/` — schemas and tool contracts.
- `.agent/` — prompts and checklists for coding agents.

## Current app state

**Production-ready MVP.** Auth, real DB-backed canvas, OpenRouter LLM, and all core flows are wired end-to-end. See `CURRENT_STATUS.md` for details.

## Local development

### Prerequisites

- Node.js 20+
- Docker (for local Postgres)

### 1. Start the database

```bash
docker compose up -d postgres
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Copy `.env.example` to `.env.local` and fill in:

```bash
DATABASE_URL=postgresql://visual_whiteboard:visual_whiteboard_dev@localhost:5444/visual_whiteboard_ai
AUTH_SECRET=<generate with: openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000
APP_SIGNUP=enable
LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=<your key from openrouter.ai>
OPENROUTER_MODEL=anthropic/claude-3-haiku   # or any OpenRouter model
```

To disable new account creation locally or in production, set:

```bash
APP_SIGNUP=disable
```

Login remains available for existing users.

To use the deterministic local stub (no API key needed):

```bash
LLM_PROVIDER=local
```

### 4. Apply migrations and start

```bash
npx prisma migrate dev
npm run dev
```

Open `http://localhost:3000`.

## Routes

| Route         | Description                                           |
| ------------- | ----------------------------------------------------- |
| `/signup`     | Create an account                                     |
| `/login`      | Sign in                                               |
| `/`           | Whiteboard workspace — boards, canvas, assistant chat |
| `/tasks`      | Task center — create and complete tasks               |
| `/core`       | Editable Markdown core files for the assistant        |
| `/api/health` | Public health check for deployment platforms          |

## Useful checks

```bash
npm run lint
npm run typecheck
npm test
npm run format:check
npm run build
npm run docs:check
npm run db:validate
npm run db:generate
npm run db:smoke
npm run telegram:webhook
```

`npm run telegram:webhook` registers `APP_URL/api/telegram/webhook` with Telegram using `TELEGRAM_BOT_TOKEN` and optional `TELEGRAM_WEBHOOK_SECRET`.

For a Dokploy/Hetzner test deploy, see `docs/deployment/DOKPLOY_HETZNER.md`.

## Recommended first instruction for coding agents

```text
Read AGENTS.md, README.md, CURRENT_STATUS.md, SESSION_HANDOFF.md, TODO.md, and docs/implementation/PHASES.md.

Pick the first incomplete P1 task in TODO.md. Before editing, write a short implementation plan covering: what changes, which files, assumptions, risks, and which checks you will run. Make the smallest correct change. After the change, update any relevant docs, update CURRENT_STATUS.md, update SESSION_HANDOFF.md, and list all checks run or skipped.
```

## Non-negotiable build principles

1. Mobile-first.
2. Assistant edits the board only through structured tools.
3. Canvas objects are structured data, not raw pixels.
4. Generated HTML widgets run in sandboxed iframes with explicit permissions.
5. Docs stay synchronized with implementation every session.
6. Every meaningful session ends with a handoff.
7. Strict security around tokens, user data, generated code, and external integrations.
