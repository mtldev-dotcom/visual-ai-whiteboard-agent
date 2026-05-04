# Current Status

Last updated: 2026-05-03

## Stage

Phase 0, Phase 1 P0, Phase 2 P0, Phase 3 P0, Phase 4 P0, Phase 5 P0, Phase 6 P0, Phase 7 P0, and Phase 8 P0 foundation complete.

## Current goal

Build the MVP foundation for a mobile-first AI whiteboard assistant where the assistant can create and edit structured board objects through tools.

## What exists

- Product vision.
- Agent operating contract.
- Architecture docs.
- Accepted initial stack decision: TypeScript, Next.js/React server routes, Tailwind CSS, Postgres, Prisma, Vitest, Playwright, provider-agnostic assistant adapter, Telegram webhook adapter, and sandboxed iframe widget runtime.
- Runnable Next.js App Router skeleton under `src/app/`.
- Mobile-first initial workspace shell with board, canvas, assistant, and bottom navigation regions.
- Project scripts for dev, build, lint, format check, typecheck, test, and docs workflow checks.
- Safe `.env.example` placeholders.
- Local Docker Postgres service on `127.0.0.1:5444` with an applied initial Prisma migration.
- Prisma 7/Postgres setup with generated client output, database validation/generation scripts, and implemented `Workspace`, `Board`, and `CanvasItem` models.
- Typed workspace helpers in `src/db/workspaces.ts`.
- Typed board and sub-board helpers in `src/db/boards.ts`.
- Typed canvas item helpers in `src/db/canvas-items.ts`.
- Static board explorer UI with desktop sidebar and mobile drawer behavior in the starter shell.
- Client-side canvas viewport with pointer panning and zoom controls.
- Demo renderers for text, sticky note, markdown, image, and link canvas item types.
- Click/tap item selection with visible selection state.
- Demo canvas items can be moved and resized in local component state.
- Mobile selected-item bottom sheet with placeholder Edit, Copy, Ask AI, and Delete controls.
- Floating board assistant button on desktop canvas.
- Local assistant chat panel with message display and composer.
- Structured tool execution card rendering in assistant chat.
- Server-side LLM adapter contract with deterministic `local` provider and unit tests.
- Server-side tool registry with validation, permission metadata, structured execution results, and unit tests.
- Registered `create_board` and `create_sub_board` tool definitions with validation and persistence-backed execution.
- Registered `add_canvas_item`, `update_canvas_item`, and confirmed `delete_canvas_item` tool definitions with validation and persistence-backed execution.
- Widget manifest JSON Schema and example manifest.
- Widget library UI surfaced in desktop and mobile board explorer areas.
- Demo task list and notes widgets rendered on the canvas.
- Prisma models for widget definitions, widget instances, and versioned custom HTML widget source.
- Restrictive sandboxed iframe renderer for demo custom HTML widgets.
- Widget permission validation with default-deny network/tool access for custom HTML widgets.
- DB helpers and smoke coverage for storing versioned custom HTML widget source.
- Confirmation gate before sandboxed generated HTML runs.
- Prisma task and reminder models with typed creation/list helpers.
- Static mobile-first task center page at `/tasks`.
- Telegram bot setup docs covering BotFather, secrets, webhook setup, and polling/webhook behavior.
- Prisma models for Telegram link tokens and linked Telegram accounts.
- Server helpers for issuing hashed short-lived Telegram link tokens, consuming them once, looking up active linked accounts, and soft-unlinking Telegram accounts.
- Unit coverage for Telegram link-token format, hashing, expiry, and comparison behavior.
- Database smoke coverage for Telegram account linking and unlinking.
- Telegram text command handler with linked-account enforcement and `/boards` support.
- Unit coverage for Telegram command parsing, unlinked `/boards` rejection, empty board lists, and capped board list formatting.
- Telegram `/tasks` command support for listing open tasks from the linked workspace.
- Unit coverage for unlinked `/tasks` rejection, empty task lists, due/priority formatting, and capped task list formatting.
- Prisma audit event model and typed audit helper.
- Telegram `/newboard` command support for creating a board in the linked workspace and recording a `board.created` audit event.
- Unit coverage for unlinked `/newboard` rejection, usage validation, successful board creation, and audit recording.
- Telegram `/addnote <board>: <note>` command support for adding structured sticky-note canvas items to boards in the linked workspace and recording a `canvas_item.created` audit event.
- Unit coverage for add-note parsing, unlinked `/addnote` rejection, usage validation, missing-board behavior, successful note creation, board-title matching, and audit recording.
- Editable `/core` route for viewing and saving whitelisted Markdown core files under `docs/agent-core/`.
- Server-only core file helper with strict filename whitelist, path traversal protection, and file size guard.
- Unit coverage for core file whitelist and path validation.
- Assistant core context loader for `CORE.md`, `ASSISTANT.md`, `TOOLS.md`, `SKILLS.md`, and `RULES.md`.
- Local LLM adapter now loads assistant core context and reports core-context metadata in deterministic responses.
- Core file update rules in `docs/agent-core/AGENTS.md` and `docs/agent-core/RULES.md`.
- Implementation phases.
- Master TODO.
- QA plan.
- Markdown core file plan.
- Session handoff workflow.

## What does not exist yet

- Phase 2 P1 enhancements such as grouping, frames, minimap, and later collaboration.
- Persistence-backed canvas screen.
- Hosted assistant provider integration.
- Telegram bot.
- Telegram webhook route and command handlers.
- Widget runtime.
- Auth.

## Recommended next task

Continue with the next incomplete P0 task in Phase 9: run full manual QA in `docs/qa/MANUAL_QA.md`.

## Known risks

- Whiteboard scope can become too large. MVP must focus on structured canvas items, not full Miro replacement.
- `npm audit --audit-level=moderate` currently reports a moderate PostCSS advisory through Next.js 16.2.4. npm only suggests `npm audit fix --force`, which would install an old breaking Next version, so this needs monitoring until a safe upstream Next/PostCSS fix is available.
- `npm audit --audit-level=moderate` also reports an `@hono/node-server` advisory through Prisma dev dependencies. npm only suggests `npm audit fix --force`, which would install an older breaking Prisma version.
- Generated HTML widgets create security risk. Sandbox and permissions must be implemented before broad widget generation.
- Telegram actions can modify persistent data. Account linking and permissions must be designed carefully.
- Mobile whiteboard UX is hard. Mobile interactions must be designed first, not patched later.
