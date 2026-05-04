# Latest Session Handoff

Date: 2026-05-03

## Summary

Completed Phase 0 foundation work after the initial stack decision, completed Phase 1 P0 data/UI foundation, completed Phase 2 P0 demo canvas foundation, completed Phase 3 P0 assistant/tool foundation, completed Phase 4 P0 widget foundation, completed Phase 5 P0 custom HTML widget foundation, completed Phase 6 P0 task/reminder foundation, completed Phase 7 P0 Telegram foundation, and completed Phase 8 P0 Markdown core foundation. The repo now has a runnable Next.js App Router skeleton, Tailwind CSS, ESLint, Prettier, TypeScript checks, Vitest command, docs workflow check, local Docker Postgres, Prisma migrations, typed workspace/board/canvas item helpers, assistant chat UI, provider-agnostic LLM adapter, tool registry, initial board/canvas tools, widget manifest schema, widget library UI, demo task/notes widgets, custom HTML widget persistence models, restrictive iframe renderer, default-deny widget permissions, generated-widget confirmation, task/reminder persistence helpers, a static task center page, Telegram setup guidance, server-side Telegram account linking helpers, `/boards`, `/tasks`, `/newboard`, `/addnote` Telegram command handlers, a `/core` Markdown core file editor, assistant core-context loading, and documented core file update rules.

## Files changed this session

- `.gitignore`
- `.env.example`
- `.prettierignore`
- `docker-compose.yml`
- `README.md`
- `CURRENT_STATUS.md`
- `SESSION_HANDOFF.md`
- `TODO.md`
- `docs/agent-core/AGENTS.md`
- `docs/agent-core/RULES.md`
- `docs/architecture/DATA_MODEL.md`
- `docs/architecture/ASSISTANT_TOOLS.md`
- `docs/agent-core/TOOLS.md`
- `docs/architecture/TECH_DECISIONS.md`
- `docs/implementation/PIPELINE.md`
- `docs/architecture/WIDGET_RUNTIME.md`
- `docs/architecture/TELEGRAM_INTEGRATION.md`
- `eslint.config.mjs`
- `next-env.d.ts`
- `next.config.ts`
- `package.json`
- `package-lock.json`
- `postcss.config.mjs`
- `prisma/AGENTS.md`
- `prisma/migrations/20260503223405_init/migration.sql`
- `prisma/migrations/20260503225609_widget_data_model/migration.sql`
- `prisma/migrations/20260503230036_tasks_reminders/migration.sql`
- `prisma/migrations/20260503233701_telegram_account_linking/migration.sql`
- `prisma/migrations/20260503234544_audit_events/migration.sql`
- `prisma/migrations/migration_lock.toml`
- `prisma/schema.prisma`
- `prisma.config.ts`
- `public/*`
- `scripts/AGENTS.md`
- `scripts/check-docs.mjs`
- `scripts/db-smoke.ts`
- `specs/canvas-item.schema.json`
- `specs/widget-manifest.example.json`
- `specs/widget-manifest.schema.json`
- `src/app/AGENTS.md`
- `src/app/components/AGENTS.md`
- `src/app/components/AssistantPanel.tsx`
- `src/app/components/BoardCanvas.tsx`
- `src/app/components/SandboxedHtmlWidget.tsx`
- `src/app/components/WidgetLibrary.tsx`
- `src/app/core/page.tsx`
- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/tasks/page.tsx`
- `src/db/AGENTS.md`
- `src/db/audit.ts`
- `src/db/boards.ts`
- `src/db/canvas-items.ts`
- `src/db/client.ts`
- `src/db/reminders.ts`
- `src/db/tasks.ts`
- `src/db/telegram.ts`
- `src/db/widgets.ts`
- `src/db/workspaces.ts`
- `src/server/AGENTS.md`
- `src/server/assistant/AGENTS.md`
- `src/server/assistant/board-tools.test.ts`
- `src/server/assistant/board-tools.ts`
- `src/server/assistant/canvas-tools.test.ts`
- `src/server/assistant/canvas-tools.ts`
- `src/server/assistant/llm.test.ts`
- `src/server/assistant/llm.ts`
- `src/server/assistant/tools.test.ts`
- `src/server/assistant/tools.ts`
- `src/server/core-files.test.ts`
- `src/server/core-files.ts`
- `src/server/telegram/AGENTS.md`
- `src/server/telegram/account-linking.test.ts`
- `src/server/telegram/account-linking.ts`
- `src/server/telegram/commands.test.ts`
- `src/server/telegram/commands.ts`
- `src/server/widgets/AGENTS.md`
- `src/server/widgets/permissions.test.ts`
- `src/server/widgets/permissions.ts`
- `tsconfig.json`
- `vitest.config.ts`

## Checks run

- `npm run lint` passed.
- `npm run typecheck` passed.
- `npm test -- --run src/server/telegram/account-linking.test.ts` passed: 1 test file, 3 tests.
- `npm test -- --run src/server/telegram/commands.test.ts` passed: 1 test file, 19 tests.
- `npm test -- --run src/server/core-files.test.ts` passed: 1 test file, 4 tests.
- `npm test -- --run src/server/core-files.test.ts src/server/assistant/llm.test.ts` passed: 2 test files, 8 tests.
- `npm test` passed: 8 test files, 51 tests.
- `npm run format:check` passed.
- `npm run docs:check` passed.
- `npm run db:format` passed.
- `npm run db:validate` passed.
- `npm run db:generate` passed.
- `docker compose up -d postgres` passed and started Postgres on `127.0.0.1:5444`.
- `npx prisma migrate dev --name init` passed against the Docker database and created the initial migration.
- `npx prisma migrate dev --name widget_data_model` passed against the Docker database.
- `npx prisma migrate dev --name tasks_reminders` passed against the Docker database.
- `npx prisma migrate dev --name telegram_account_linking` passed against the Docker database with an explicit local `DATABASE_URL` for port `5444`.
- `npx prisma migrate dev --name audit_events` passed against the Docker database with an explicit local `DATABASE_URL` for port `5444`.
- `npm run db:smoke` passed against the Docker database.
- `npm run build` passed.
- `git diff --check` passed; Git reported CRLF normalization warnings only.
- `npm audit --audit-level=moderate` failed with 5 moderate advisories through Next.js/PostCSS and Prisma-related dependencies.
- Started `npm run dev -- --hostname 127.0.0.1 --port 3000`; verified `/` and `/tasks` return HTTP 200.

## Checks skipped

- E2E tests.

Reason: no Playwright suite or real app flows exist yet.

## Important decisions

- Used `create-next-app@latest` to create the skeleton with TypeScript, Tailwind CSS, ESLint, App Router, `src/`, npm, and `@/*` alias.
- Added Prettier and Vitest to satisfy Phase 0 script coverage.
- Added `npm run docs:check` as the initial docs workflow script.
- Updated `.env.example` for the local Docker Postgres URL on port `5444`.
- Added `src/app/AGENTS.md` and `scripts/AGENTS.md` so newly important folders have local contracts.
- Used Prisma 7 with the PostgreSQL adapter and generated client output under ignored `src/generated/prisma/`.
- Added `docker-compose.yml` for local Postgres and applied the initial Prisma migration.
- Added the first persistent models: `Workspace`, `Board`, and `CanvasItem`.
- `Board` includes workspace ownership, explicit optional parent/sub-board self-relation, title, optional description, created-by marker, timestamps, and soft archive timestamp.
- Board persistence helpers cover create, read/list, update, and safe archive behavior.
- `CanvasItem` includes stable ID, workspace/board ownership, type, position, size, JSON content/style/metadata/safety metadata, created-by marker, timestamps, and soft delete timestamp.
- Canvas item persistence helpers cover create, read/list, update, and safe soft delete behavior.
- The starter UI now includes a desktop board explorer sidebar and mobile board drawer disclosure backed by placeholder board data.
- The board canvas now supports pointer panning and zoom controls.
- The canvas shell renders demo text, sticky note, markdown, image, and link item types from structured item data.
- Canvas items can be selected by click/tap and show a visible selection state.
- Selected demo canvas items can be dragged to move and resized from a bottom-right handle.
- Mobile view shows a selected-item bottom sheet with placeholder item actions.
- Desktop canvas has a floating board assistant button.
- Assistant panel now has local chat message state and a composer.
- Assistant chat can render structured tool execution cards.
- Added provider-agnostic LLM adapter types and deterministic `local` provider.
- Added server-side tool registry with validation, permission metadata, structured execution results, and unit tests.
- Added `create_board` and `create_sub_board` tool definitions with input validation and persistence-backed execution.
- Added `add_canvas_item`, `update_canvas_item`, and confirmed `delete_canvas_item` tool definitions with input validation and persistence-backed execution.
- Tightened widget manifest schema and added an example task-list manifest.
- Added widget library UI in the board explorer areas.
- Added demo task list and notes widget renderers on the canvas.
- Added custom HTML widget data models for definitions, instances, and versioned source.
- Added restrictive sandboxed iframe renderer with `sandbox="allow-scripts"` and no same-origin grant.
- Added widget permission validation and default-deny network/tool access for custom HTML widgets.
- Added DB helpers and smoke coverage for versioned custom HTML widget source storage.
- Added confirmation gate before sandboxed generated HTML receives `srcDoc`.
- Added task and reminder Prisma models with typed creation/list helpers.
- Added static mobile-first task center page at `/tasks`.
- Added Telegram bot setup docs covering BotFather, env secrets, webhook setup, and polling/webhook behavior.
- Added `TelegramLinkToken` and `TelegramAccount` models for one-time short-lived account linking.
- Telegram link token records store only SHA-256 token hashes; raw tokens are returned at issue time and are not persisted.
- Added server token helpers for 15-minute token issuance, hashing, format validation, expiry checks, and constant-time comparison.
- Added DB helpers for issuing link tokens, consuming tokens once in a transaction, active account lookup, and soft unlinking.
- Added `src/server/telegram/AGENTS.md` so Telegram server code has local security rules.
- Extended DB smoke coverage to verify Telegram link, active lookup, and unlink behavior.
- Added `handleTelegramTextCommand` with `/boards` support.
- `/boards` rejects unlinked Telegram users before listing boards.
- `/boards` lists up to 10 active boards from the linked account's workspace.
- Added `/tasks` support to `handleTelegramTextCommand`.
- `/tasks` rejects unlinked Telegram users before listing tasks.
- `/tasks` lists up to 10 open tasks from the linked account's workspace and includes priority/due date context when available.
- Added `AuditEvent` and `recordAuditEvent` for persistent action traceability.
- Added `/newboard` support to `handleTelegramTextCommand`.
- `/newboard` rejects unlinked Telegram users before creating boards.
- `/newboard` creates a board in the linked account's workspace and records a `board.created` audit event with actor type `telegram`.
- Added `/addnote <board>: <note>` support to `handleTelegramTextCommand`.
- `/addnote` rejects unlinked Telegram users before creating canvas items.
- `/addnote` resolves boards by title in the linked workspace, creates structured `sticky_note` canvas items, and records a `canvas_item.created` audit event with actor type `telegram`.
- Added `/core`, a mobile-friendly server-rendered editor for whitelisted Markdown core files under `docs/agent-core/`.
- Added `src/server/core-files.ts` with core filename whitelist validation, path traversal protection, and a file size guard before writes.
- Linked `/core` from the desktop header and mobile bottom navigation.
- Added assistant core-context loading for `CORE.md`, `ASSISTANT.md`, `TOOLS.md`, `SKILLS.md`, and `RULES.md`.
- Updated the local LLM adapter to load core context and expose deterministic core-context metadata.
- Updated `docs/agent-core/TOOLS.md` so loaded tool context matches implemented tools and Telegram commands.
- Documented which core file to update for tool, Telegram command, assistant behavior, safety, memory, board, and product-context changes.

## Known issues

- `npm audit --audit-level=moderate` reports PostCSS XSS advisory `GHSA-qx2v-qp2m-jg93` through `next@16.2.4`. npm suggests `npm audit fix --force`, but that would install `next@9.3.3`, a breaking downgrade. Do not apply that automated fix without a deliberate dependency decision.
- `npm audit --audit-level=moderate` also reports `@hono/node-server` advisory `GHSA-92pp-h63x-v22m` through Prisma dev dependencies. npm suggests `npm audit fix --force`, but that would install `prisma@6.19.3`, a breaking downgrade from Prisma 7.
- The UI is still mostly demo/local state; no persistence-backed canvas screen, hosted assistant runtime, auth, Telegram webhook route, or Telegram command handling exists yet.

## Next recommended task

Continue with the next incomplete P0 task in Phase 9: run full manual QA in `docs/qa/MANUAL_QA.md`.
