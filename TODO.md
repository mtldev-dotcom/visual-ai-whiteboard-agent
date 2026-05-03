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

- [ ] `P0` Choose initial app stack and document the decision in `docs/architecture/TECH_DECISIONS.md`.
- [ ] `P0` Create initial app skeleton.
- [ ] `P0` Add lint, format, typecheck, and test commands.
- [ ] `P0` Add `.env.example` with safe placeholders.
- [ ] `P0` Create base mobile-first layout shell.
- [ ] `P0` Create initial docs update workflow in project scripts or checklist.
- [ ] `P0` Confirm all important folders have `AGENTS.md`.

## Phase 1 — Board engine

- [ ] `P0` Implement workspace model.
- [ ] `P0` Implement board model.
- [ ] `P0` Implement sub-board/parent-board relationship.
- [ ] `P0` Implement canvas item model.
- [ ] `P0` Create board explorer sidebar/drawer.
- [ ] `P0` Create mobile board drawer behavior.
- [ ] `P0` Implement create/read/update/delete for boards.
- [ ] `P0` Implement create/read/update/delete for canvas items.
- [ ] `P1` Implement board links as canvas items.
- [ ] `P1` Implement board search.
- [ ] `P1` Add undo/rollback model for canvas changes.

## Phase 2 — Canvas UI

- [ ] `P0` Render canvas with pan and zoom.
- [ ] `P0` Render basic item types: text, sticky note, markdown, image, link.
- [ ] `P0` Add item selection.
- [ ] `P0` Add item move and resize.
- [ ] `P0` Add mobile bottom sheet for selected item controls.
- [ ] `P0` Add floating assistant button on board.
- [ ] `P1` Add grouping/sections.
- [ ] `P1` Add frames.
- [ ] `P1` Add canvas minimap or board overview.
- [ ] `P2` Add realtime presence/collaboration.

## Phase 3 — Assistant and tool calling

- [ ] `P0` Implement assistant chat UI.
- [ ] `P0` Implement provider-agnostic LLM adapter.
- [ ] `P0` Implement tool registry.
- [ ] `P0` Implement tool call execution cards in chat.
- [ ] `P0` Implement `create_board` tool.
- [ ] `P0` Implement `create_sub_board` tool.
- [ ] `P0` Implement `add_canvas_item` tool.
- [ ] `P0` Implement `update_canvas_item` tool.
- [ ] `P0` Implement `delete_canvas_item` tool with safe confirmation behavior.
- [ ] `P1` Implement `summarize_board` tool.
- [ ] `P1` Implement `organize_board` tool.
- [ ] `P1` Implement `duplicate_board` tool.
- [ ] `P1` Implement `rollback_canvas_change` tool.
- [ ] `P1` Persist chat threads and tool calls.

## Phase 4 — Prebuilt widgets

- [ ] `P0` Define widget manifest format.
- [ ] `P0` Build widget library UI.
- [ ] `P0` Add task list widget.
- [ ] `P0` Add notes widget.
- [ ] `P1` Add Kanban widget.
- [ ] `P1` Add markdown reader widget.
- [ ] `P1` Add rich text editor widget.
- [ ] `P1` Add reminders widget.
- [ ] `P2` Add finance tracker widget.
- [ ] `P2` Add CRM widget.
- [ ] `P2` Add project management widget.
- [ ] `P2` Add habit tracker widget.

## Phase 5 — Sandboxed custom HTML widgets

- [ ] `P0` Define custom HTML widget data model.
- [ ] `P0` Implement iframe sandbox renderer.
- [ ] `P0` Implement widget permission model.
- [ ] `P0` Disable network/tool access by default.
- [ ] `P0` Store generated widget source/version.
- [ ] `P0` Add confirmation before running generated widget.
- [ ] `P1` Add widget preview before insertion.
- [ ] `P1` Add widget rollback/version history.
- [ ] `P1` Allow assistant to generate safe simple widgets.
- [ ] `P2` Add mediated bridge from widget to board state.

## Phase 6 — Tasks, reminders, alarms, schedules

- [ ] `P0` Implement task model.
- [ ] `P0` Implement reminder model.
- [ ] `P0` Implement task center page.
- [ ] `P1` Add recurring schedule model.
- [ ] `P1` Add cron-like schedules with guardrails.
- [ ] `P1` Add notification preferences.
- [ ] `P1` Add assistant tool for task creation.
- [ ] `P1` Add assistant tool for reminder creation.
- [ ] `P2` Add daily digest.

## Phase 7 — Telegram integration

- [ ] `P0` Create Telegram bot setup docs.
- [ ] `P0` Implement account linking flow.
- [ ] `P0` Implement `/boards`.
- [ ] `P0` Implement `/tasks`.
- [ ] `P0` Implement `/newboard`.
- [ ] `P0` Implement `/addnote`.
- [ ] `P1` Implement `/remind`.
- [ ] `P1` Implement `/summarize`.
- [ ] `P1` Support photo/file capture into board.
- [ ] `P1` Support voice note transcription if available.
- [ ] `P2` Support Telegram inline buttons for board actions.

## Phase 8 — Markdown core files

- [ ] `P0` Create editable core file viewer.
- [ ] `P0` Load `CORE.md`, `ASSISTANT.md`, `TOOLS.md`, `SKILLS.md`, and `RULES.md` into assistant context.
- [ ] `P0` Document core file update rules.
- [ ] `P1` Add board-aware memory summaries.
- [ ] `P1` Add memory review UI.
- [ ] `P2` Add safe memory extraction workflow.

## Phase 9 — Polish, QA, launch prep

- [ ] `P0` Run full manual QA in `docs/qa/MANUAL_QA.md`.
- [ ] `P0` Verify mobile UX on small screen width.
- [ ] `P0` Verify permission boundaries.
- [ ] `P0` Verify generated widget sandboxing.
- [ ] `P0` Verify Telegram account linking and command safety.
- [ ] `P1` Add onboarding flow.
- [ ] `P1` Add empty states and loading states.
- [ ] `P1` Add error states and recovery actions.
- [ ] `P1` Add demo board templates.
- [ ] `P2` Add analytics/events with privacy review.
