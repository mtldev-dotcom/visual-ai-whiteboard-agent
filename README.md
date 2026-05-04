# Visual AI Whiteboard Assistant — Agent-Ready Starter Plan

This repository is a planning and execution scaffold for building a **mobile-first AI assistant with a living whiteboard/canvas**.

The assistant behaves like a normal AI assistant from web chat and Telegram, but it also has expert whiteboard skills: it can create boards, sub-boards, visual diagrams, notes, images, embedded browser views, task widgets, reminders, and custom sandboxed HTML mini-apps on the canvas.

## One-sentence product pitch

A mobile-first AI workspace where users chat with an assistant that can think visually, create boards, build mini apps, manage tasks, and organize work/life through web UI and Telegram.

## What is inside this starter repo

- `AGENTS.md` — root operating contract for all coding agents.
- `TODO.md` — execution backlog agents can work through.
- `CURRENT_STATUS.md` — live project state, must be updated every session.
- `SESSION_HANDOFF.md` — latest handoff summary, must be updated every session.
- `docs/product/` — product vision, PRD, MVP scope, user flows, mobile UX.
- `docs/architecture/` — system overview, data model, canvas engine, assistant tools, widget runtime, Telegram integration, security.
- `docs/implementation/` — phases, task pipeline, definition of done, milestones.
- `docs/agent-core/` — Markdown core files for the assistant personality, tools, skills, rules, memory, and board index.
- `docs/qa/` — testing strategy and manual QA flows.
- `specs/` — structured schemas and tool contracts for the canvas assistant.
- `.agent/` — prompts and workflow checklists for Codex, Claude Code, DeepSeek, or similar coding agents.
- `src/AGENTS.md` — source-code ownership rules for future implementation.

## Local development

The initial app skeleton uses TypeScript, Next.js App Router, Tailwind CSS, ESLint, Prettier, and Vitest.

Install dependencies:

```bash
npm install
```

Run the app locally:

```bash
npm run dev
```

Useful local routes:

- `/` — whiteboard workspace shell.
- `/tasks` — task center.
- `/core` — editable Markdown core file viewer.

Start the local Postgres database on port `5444`:

```bash
docker compose up -d postgres
```

Use this local development database URL:

```bash
DATABASE_URL=postgresql://visual_whiteboard:visual_whiteboard_dev@localhost:5444/visual_whiteboard_ai
```

Use the deterministic local assistant adapter for development:

```bash
LLM_PROVIDER=local
```

Apply Prisma migrations:

```bash
npx prisma migrate dev
```

Useful checks:

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
```

## Recommended first instruction to give a coding agent

Paste this into your coding agent after unzipping:

```text
Read AGENTS.md, README.md, CURRENT_STATUS.md, SESSION_HANDOFF.md, TODO.md, and docs/implementation/PHASES.md.

Then start with the first incomplete P0 task in TODO.md. Before editing, write a short implementation plan. Make the smallest correct change. After the change, update any relevant docs, update CURRENT_STATUS.md, update SESSION_HANDOFF.md, and list all checks run or skipped.

Do not invent a different architecture unless you document the reason and update the relevant architecture docs.
```

## Recommended initial stack

This repo is mostly stack-neutral, but the default recommendation is:

- Web app: TypeScript + React framework with server routes.
- Canvas: React-based infinite canvas or grid/canvas hybrid.
- Styling: utility-first CSS or a small design-token system.
- Database: Postgres.
- Realtime/sync: start simple, add collaborative presence later.
- Agent: provider-agnostic LLM adapter with tool calls.
- Telegram: bot integration with webhook or polling.
- Widget runtime: sandboxed iframe for generated/custom HTML widgets.

Coding agents must check official package/framework docs before introducing versions, APIs, or major dependencies.

## Non-negotiable build principles

1. Mobile-first.
2. Assistant can edit the board through structured tools.
3. Canvas objects are structured data, not raw pixels.
4. Generated HTML widgets run in sandboxed iframes with explicit permissions.
5. Docs stay synchronized with implementation every session.
6. Every meaningful session ends with a handoff.
7. Strict security around tokens, user data, generated code, and external integrations.
