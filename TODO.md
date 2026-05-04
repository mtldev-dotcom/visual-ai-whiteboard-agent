# Master TODO

Status legend:

- `[ ]` not started
- `[~]` in progress
- `[x]` done
- `[!]` blocked or needs decision

Priority legend:

- `P0` required for MVP foundation
- `P1` required for useful MVP
- `P2` important after MVP
- `P3` later enhancement

## Phase 0 — Repository and product foundation

- [x] `P0` Choose initial app stack and document the decision in `docs/architecture/TECH_DECISIONS.md`.
- [x] `P0` Create initial app skeleton.
- [x] `P0` Add lint, format, typecheck, and test commands.
- [x] `P0` Add `.env.example` with safe placeholders.
- [x] `P0` Create base mobile-first layout shell.
- [x] `P0` Create initial docs update workflow in project scripts or checklist.
- [x] `P0` Confirm all important folders have `AGENTS.md`.

## Phase 1 — Board engine

- [x] `P0` Implement workspace model.
- [x] `P0` Implement board model.
- [x] `P0` Implement sub-board/parent-board relationship.
- [x] `P0` Implement canvas item model.
- [x] `P0` Create board explorer sidebar/drawer.
- [x] `P0` Create mobile board drawer behavior.
- [x] `P0` Implement create/read/update/delete for boards.
- [x] `P0` Implement create/read/update/delete for canvas items.
- [ ] `P1` Implement board links as canvas items.
- [x] `P1` Implement board search.
- [ ] `P1` Add undo/rollback model for canvas changes.

## Phase 2 — Canvas UI

- [x] `P0` Render canvas with pan and zoom.
- [x] `P0` Render basic item types: text, sticky note, markdown, image, link.
- [x] `P0` Add item selection.
- [x] `P0` Add item move and resize.
- [x] `P0` Add mobile bottom sheet for selected item controls.
- [x] `P0` Add floating assistant button on board.
- [ ] `P1` Add grouping/sections.
- [ ] `P1` Add frames.
- [ ] `P1` Add canvas minimap or board overview.
- [ ] `P2` Add realtime presence/collaboration.

## Phase 3 — Assistant and tool calling

- [x] `P0` Implement assistant chat UI.
- [x] `P0` Implement provider-agnostic LLM adapter.
- [x] `P0` Implement tool registry.
- [x] `P0` Implement tool call execution cards in chat.
- [x] `P0` Implement `create_board` tool.
- [x] `P0` Implement `create_sub_board` tool.
- [x] `P0` Implement `add_canvas_item` tool.
- [x] `P0` Implement `update_canvas_item` tool.
- [x] `P0` Implement `delete_canvas_item` tool with safe confirmation behavior.
- [x] `P1` Implement `summarize_board` tool.
- [x] `P1` Implement `list_canvas_items` tool.
- [ ] `P1` Implement `organize_board` tool.
- [ ] `P1` Implement `duplicate_board` tool.
- [ ] `P1` Implement `rollback_canvas_change` tool.
- [x] `P1` Persist chat threads and tool calls.

## Phase 4 — Prebuilt widgets

- [x] `P0` Define widget manifest format.
- [x] `P0` Build widget library UI.
- [x] `P0` Add task list widget.
- [x] `P0` Add notes widget.
- [x] `P1` Add Kanban widget.
- [ ] `P1` Add markdown reader widget.
- [ ] `P1` Add rich text editor widget.
- [ ] `P1` Add reminders widget.
- [ ] `P2` Add finance tracker widget.
- [ ] `P2` Add CRM widget.
- [ ] `P2` Add project management widget.
- [ ] `P2` Add habit tracker widget.

## Phase 5 — Sandboxed custom HTML widgets

- [x] `P0` Define custom HTML widget data model.
- [x] `P0` Implement iframe sandbox renderer.
- [x] `P0` Implement widget permission model.
- [x] `P0` Disable network/tool access by default.
- [x] `P0` Store generated widget source/version.
- [x] `P0` Add confirmation before running generated widget.
- [ ] `P1` Add widget preview before insertion.
- [ ] `P1` Add widget rollback/version history.
- [ ] `P1` Allow assistant to generate safe simple widgets.
- [ ] `P2` Add mediated bridge from widget to board state.

## Phase 6 — Tasks, reminders, alarms, schedules

- [x] `P0` Implement task model.
- [x] `P0` Implement reminder model.
- [x] `P0` Implement task center page.
- [ ] `P1` Add recurring schedule model.
- [ ] `P1` Add cron-like schedules with guardrails.
- [ ] `P1` Add notification preferences.
- [x] `P1` Add assistant tool for task creation.
- [x] `P1` Add assistant tool for reminder creation.
- [x] `P1` Add assistant tools: list_tasks, list_reminders.
- [ ] `P2` Add daily digest.

## Phase 7 — Telegram integration

- [x] `P0` Create Telegram bot setup docs.
- [x] `P0` Implement account linking flow.
- [x] `P0` Implement `/boards`.
- [x] `P0` Implement `/tasks`.
- [x] `P0` Implement `/newboard`.
- [x] `P0` Implement `/addnote`.
- [ ] `P1` Implement `/remind`.
- [ ] `P1` Implement `/summarize`.
- [ ] `P1` Support photo/file capture into board.
- [ ] `P1` Support voice note transcription if available.
- [ ] `P2` Support Telegram inline buttons for board actions.

## Phase 8 — Markdown core files

- [x] `P0` Create editable core file viewer.
- [x] `P0` Load `CORE.md`, `ASSISTANT.md`, `TOOLS.md`, `SKILLS.md`, and `RULES.md` into assistant context.
- [x] `P0` Document core file update rules.
- [ ] `P1` Add board-aware memory summaries.
- [ ] `P1` Add memory review UI.
- [ ] `P2` Add safe memory extraction workflow.

## Phase 9 — Polish, QA, launch prep

- [~] `P0` Run full manual QA in `docs/qa/MANUAL_QA.md`. (lint/typecheck/tests/build all pass; live end-to-end walk requires OPENROUTER_API_KEY)
- [~] `P0` Verify mobile UX on small screen width. (layout verified at 390px; live device test pending)
- [x] `P0` Verify permission boundaries. (requireSession() on all routes; soft-delete enforced)
- [x] `P0` Verify generated widget sandboxing. (iframe sandbox confirmed; confirmation gate in place)
- [!] `P0` Verify Telegram account linking and command safety. (Telegram deferred; server-side handlers unit-tested)
- [x] `P1` Add onboarding flow.
- [x] `P1` Add empty states and loading states.
- [~] `P1` Add error states and recovery actions. (API error responses typed; toast on fetch failure; full recovery UX pending)
- [x] `P1` Add demo board templates.
- [ ] `P2` Add analytics/events with privacy review.

## Production wiring — completed 2026-05-04

- [x] `P0` Implement NextAuth v4 credentials auth (signup + login).
- [x] `P0` Wire home page to real boards from DB (async server component).
- [x] `P0` Wire canvas to real DB-backed items (load, move, resize, delete, edit, copy).
- [x] `P0` Wire AssistantPanel to real LLM via /api/chat with tool call loop.
- [x] `P0` Add OpenRouter LLM adapter (`openai` SDK + `baseURL`).
- [x] `P0` Wire tasks page to real DB (list, create, mark complete).
- [x] `P0` Wire widget library to real API (click → POST /api/canvas-items).
- [x] `P0` Add all API routes (boards, canvas-items, tasks, chat, workspace, auth).
- [x] `P0` Add Next.js 16 proxy for route protection.
