# Implementation Phases

## Phase 0 — Foundation

Goal: create a maintainable app skeleton with agent-safe workflows.

Deliverables:

- Stack decision.
- App skeleton.
- Scripts for lint/typecheck/test/build.
- `.env.example`.
- Base mobile layout.
- Docs workflow.
- Folder-level `AGENTS.md`.

Exit criteria:

- App runs locally.
- Checks can be run.
- Agent workflow docs are accurate.

## Phase 1 — Board engine

Goal: create persistent workspaces, boards, sub-boards, and canvas items.

Deliverables:

- Workspace model.
- Board model.
- Parent/child boards.
- Canvas item model.
- CRUD APIs/services.
- Board explorer.

Exit criteria:

- User can create board.
- User can create sub-board.
- User can add simple canvas items.
- Data persists.

## Phase 2 — Canvas UI

Goal: render and edit structured canvas items.

Deliverables:

- Pan/zoom canvas.
- Basic item renderers.
- Selection.
- Move/resize.
- Mobile bottom sheet controls.
- Floating assistant button.

Exit criteria:

- Board is usable on mobile.
- Items can be manually edited.
- Complex widgets can open full screen.

## Phase 3 — Assistant and tools

Goal: let assistant create and edit boards through tools.

Deliverables:

- Chat UI.
- LLM adapter.
- Tool registry.
- Execution cards.
- Board/canvas tools.

Exit criteria:

- User can ask assistant to create a board.
- Assistant can add canvas items.
- Tool calls are visible and persisted.

## Phase 4 — Prebuilt widgets

Goal: add reusable mini apps to boards.

Deliverables:

- Widget manifest format.
- Widget library.
- Task list widget.
- Notes widget.
- Kanban or markdown widget.

Exit criteria:

- User can add prebuilt widgets.
- Assistant can add prebuilt widgets.
- Widget data persists.

## Phase 5 — Sandboxed HTML widgets

Goal: safely run generated mini apps.

Deliverables:

- Custom widget model.
- Sandboxed iframe renderer.
- Permission model.
- Source versioning.
- Preview/confirmation.

Exit criteria:

- Assistant can generate a simple widget.
- User confirms before running.
- Widget is isolated.

## Phase 6 — Tasks and reminders

Goal: support task/reminder management.

Deliverables:

- Task model.
- Reminder model.
- Task center.
- Assistant tools.
- Schedules/recurrence basics.

Exit criteria:

- User can create tasks/reminders.
- Assistant can create tasks/reminders.
- Reminders are visible and manageable.

## Phase 7 — Telegram integration

Goal: quick capture and remote control from Telegram.

Deliverables:

- Bot setup.
- Account linking.
- Basic commands.
- Note/task capture.
- Board links in replies.

Exit criteria:

- Linked user can create notes/tasks from Telegram.
- Unlinked users are rejected.
- Actions are audited.

## Phase 8 — Markdown core files

Goal: give the assistant durable Markdown operating files.

Deliverables:

- Core file viewer/editor.
- Core files loaded into assistant context.
- Tool/skill docs aligned with implementation.
- Memory/board summary conventions.

Exit criteria:

- Assistant behavior can be influenced by core files.
- Core files accurately describe available tools and rules.

## Phase 9 — QA and launch prep

Goal: harden MVP.

Deliverables:

- Manual QA.
- Automated checks.
- Mobile testing.
- Security review.
- Demo templates.
- Onboarding.

Exit criteria:

- MVP flows pass.
- Known risks documented.
- Launch blockers resolved or accepted.
