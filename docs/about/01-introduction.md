# 01 — Introduction

## What Is This App?

The **Visual AI Whiteboard Agent** is a **mobile-first AI whiteboard assistant**. It is not a chat panel bolted onto a drawing tool. The assistant is the **main operator** of a persistent, visual workspace.

You chat with the assistant. It builds boards, moves canvas objects, creates diagrams, manages tasks, embeds browser widgets — and you can see and touch every result on a live canvas.

## What the Assistant Can Do

The assistant has first-class tool access to every part of the workspace:

- **Chat** — from the web UI or Telegram. Every message and tool call is persisted.
- **Create boards and sub-boards** — hierarchical organization of workspaces.
- **Add, edit, move, group, and summarize canvas objects** — typed items with position, size, content, style, and metadata.
- **Create diagrams** — flowcharts, mind maps, architecture diagrams.
- **Create notes** — rich, styled sticky notes on the canvas.
- **Create task lists** — prioritized, due-dated items with completion tracking.
- **Create reminders** — scheduled prompts that fire at specific times.
- **Browser embeds** — embed live web content as canvas items.
- **Custom HTML widgets** — the assistant can *generate* complete mini-apps (task boards, Kanban boards, dashboards) that run in sandboxed iframes.

## How the Assistant Thinks

The assistant's brain is not a black box. Its personality, rules, permitted tools, skills, memory, and safety constraints are defined in **editable Markdown core files** stored under `docs/agent-core/`. These files act as the assistant's durable operating context:

- `personality.md` — tone, style, and behavioral rules
- `tools.md` — what tools are available and when to use them
- `skills.md` — specialized workflows (diagramming, task management, etc.)
- `rules.md` — hard constraints, safety rules, output formatting
- `memory.md` — what the assistant should remember across sessions

These Markdown files are themselves editable through the `/core` route in the web UI. The assistant re-reads them at the start of every session, so you can tune its behavior without changing code.

## Where We Are

The project is at **production-ready MVP stage**. Auth, real DB-backed canvas, OpenRouter LLM integration, and all core flows are wired end-to-end. Nearly 70 tool-accessible operations exist. The app can be deployed via Docker with a single `docker compose up`.

## Why This Book Exists

This book explains *how* every part of the system works — Prisma schema design, database helpers, migration strategy, LLM adapter pattern, tool registry, canvas rendering architecture, widget sandboxing, Telegram integration, and deployment. It is written so that a new developer (or an AI agent) can understand the codebase fully by reading it cover to cover.
