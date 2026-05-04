# Product Specs and Supporting Documentation

This chapter provides an overview of the remaining documentation files in the project that have not been covered by previous chapters. These files define the product vision, implementation plan, QA strategy, and structural contracts.

## Specs Directory — Structural Contracts

**Directory:** `specs/`

The `specs/` directory contains JSON schemas and documentation that define the **structural contracts** of the application. These are not implementation details — they are interfaces that must be honored by both the server code and the client code.

### canvas-item.schema.json

**File:** `specs/canvas-item.schema.json`

Defines the JSON Schema for a CanvasItem object. This is the contract that every canvas item must satisfy:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "CanvasItem",
  "type": "object",
  "required": [
    "id", "workspaceId", "boardId", "type",
    "x", "y", "width", "height", "content",
    "createdAt", "updatedAt"
  ],
  "properties": {
    "type": {
      "type": "string",
      "enum": [
        "text", "sticky_note", "markdown", "image",
        "link", "iframe_embed", "html_widget",
        "task_list", "board_link", "section", "kanban"
      ]
    },
    "content": { "type": "object" },
    "style": { "type": "object" },
    "metadata": { "type": "object" },
    "deletedAt": { "type": ["string", "null"] }
  },
  "additionalProperties": false
}
```

**Key contract points:**

- Every canvas item has 11 required fields (id, workspaceId, boardId, type, x, y, width, height, content, createdAt, updatedAt).
- `type` is an enum of 11 possible values. The implementation's allowlist may be stricter (e.g., `notes` is defined in the schema but rejected by `validateAddCanvasItemInput` because it was deprecated).
- `content`, `style`, and `metadata` are free-form objects — each item type interprets them differently (e.g., a `task_list` uses `content.tasks[]`, a `kanban` uses `content.columns[]`).
- `deletedAt` is optional and supports soft deletes (null = not deleted, ISO string = soft-deleted timestamp).
- `additionalProperties: false` means no extra keys beyond those defined are allowed.

**Why a JSON Schema.** Schemas are both human-readable contracts and machine-validatable. A future client (mobile app, third-party integration, API doc generator) can use this schema to validate data without reading the TypeScript source.

### canvas-tools.schema.json

**File:** `specs/canvas-tools.schema.json`

Defines the input/output contracts for every assistant canvas tool:

```json
{
  "tools": [
    {
      "name": "create_board",
      "description": "Create a new board in a workspace.",
      "permissionLevel": 1,
      "input": {
        "workspaceId": "string",
        "parentBoardId": "string|null",
        "title": "string",
        "description": "string|null"
      },
      "output": {
        "boardId": "string",
        "title": "string"
      }
    },
    {
      "name": "add_canvas_item",
      "description": "Add a structured canvas item to a board.",
      "permissionLevel": 1,
      "input": {
        "boardId": "string",
        "type": "CanvasItem.type",
        "x": "number",
        "y": "number",
        "width": "number",
        "height": "number",
        "content": "object",
        "style": "object|null",
        "metadata": "object|null"
      },
      "output": { "itemId": "string", "type": "string" }
    },
    {
      "name": "update_canvas_item",
      "permissionLevel": 2,
      "input": { "itemId": "string", "patch": "object" },
      "output": { "itemId": "string", "updatedFields": "string[]" }
    },
    {
      "name": "delete_canvas_item",
      "permissionLevel": 2,
      "requiresConfirmation": true,
      "input": { "itemId": "string" },
      "output": { "itemId": "string", "deleted": "boolean" }
    },
    {
      "name": "generate_html_widget",
      "permissionLevel": 4,
      "requiresConfirmation": true,
      "input": {
        "boardId": "string",
        "prompt": "string",
        "requestedPermissions": "string[]"
      },
      "output": {
        "widgetDraftId": "string",
        "permissionSummary": "string",
        "previewAvailable": "boolean"
      }
    }
  ]
}
```

**Key contract points:**

- **Permission levels**: 1 = read-only operations (list, summarize), 2 = standard mutations (update, delete), 4 = high-risk operations (generate HTML widgets — requires explicit user confirmation).
- **`requiresConfirmation`**: Tools marked with this flag must not execute automatically. The LLM call loop prompts the user for confirmation, then retries with `confirmed: true`.
- **Input/output maps**: These are type-annotated but not validated against a formal schema (unlike `canvas-item.schema.json`). The implementation's `validate` functions are the runtime enforcers.

### widget-manifest.schema.json

**File:** `specs/widget-manifest.schema.json`

Defines the structure of a widget manifest — the descriptor that the widget library uses to render widget cards and insertion dialogs:

- Widget name, description, and icon.
- Default dimensions (width, height).
- Category grouping.
- Required permissions.

### widget-manifest.example.json

**File:** `specs/widget-manifest.example.json`

A concrete example manifest showing the expected shape for developers adding new widgets.

### permissions.md

**File:** `specs/permissions.md`

Documents the permission model for the application:

- **Permission levels** (1-4) and what each level allows.
- **Widget permissions**: what sandboxed widgets can and cannot access (network, storage, board state, tools).
- **Tool permission gates**: how the chat route checks permission levels before executing tool calls.
- **Actor types**: `user` (human) vs. `assistant` (AI) — what each can do.

---

## Docs/Product — Product Vision and Requirements

**Directory:** `docs/product/`

### VISION.md

**File:** `docs/product/VISION.md`

The high-level product vision document. Articulates:

- **What problem the product solves.** Mobile-first visual workspace managed by AI, replacing the friction of manual whiteboard apps.
- **Who it's for.** Individuals and small teams who need to capture ideas, organize projects, and get things done — without learning complex tools.
- **Core differentiators.** AI as the primary operator (not a chat sidebar), Markdown core files as durable context, Telegram as an additional input surface.

### PRD.md

**File:** `docs/product/PRD.md`

The Product Requirements Document. Defines:

- **Feature requirements** at the user-story level.
- **Non-functional requirements** (performance, accessibility, offline behavior, mobile responsiveness).
- **Out-of-scope items** for the current version.
- **Success metrics** (adoption, retention, task completion rate).

### MVP_SCOPE.md

**File:** `docs/product/MVP_SCOPE.md`

Defines the minimum viable product scope:

- **In scope:** Auth, boards, canvas items (8 types), AI assistant with 8+ tools, tasks, reminders, Telegram integration, widget library.
- **Out of scope:** Real-time collaboration, OAuth, analytics, payment/billing, advanced admin features.
- **MVP exit criteria:** What must be true before the MVP is considered complete.

### USER_FLOWS.md

**File:** `docs/product/USER_FLOWS.md`

Documents the key user flows:

- **Onboarding flow:** Signup → auto-seed Welcome Board → land on home page.
- **Board creation flow:** Ask assistant → assistant creates board → navigate to board.
- **Canvas item flow:** Assistant adds item → item appears on canvas → user can move/resize/edit/delete.
- **Telegram flow:** `/start <token>` → account linked → commands available.

### MOBILE_UX.md

**File:** `docs/product/MOBILE_UX.md`

Defines mobile-first design principles:

- **Touch targets:** Minimum 44px (Apple HIG standard).
- **Bottom navigation:** Primary actions at thumb reach.
- **Slide-up drawers:** Instead of full-page modals.
- **Compact headers:** 44px, no wasted vertical space.
- **Canvas gestures:** Pinch-to-zoom, swipe-to-pan, tap-to-select.

### NAMING.md

**File:** `docs/product/NAMING.md`

Defines product naming conventions and terminology:

- What to call things (e.g., "canvas item" not "element" or "object").
- Consistent capitalization rules.
- User-facing vs. internal terminology.

---

## Docs/Implementation — Execution and Process

**Directory:** `docs/implementation/`

### PHASES.md

**File:** `docs/implementation/PHASES.md`

Detailed breakdown of each implementation phase (matching `TODO.md`):

- **Phase 0:** Repository foundation and tooling setup.
- **Phase 1:** Board engine (CRUD, search, templates).
- **Phase 2:** Canvas UI (render, pan/zoom, move/resize, selection).
- **Phase 3:** AI assistant (chat, tool registry, LLM adapter, persistent history).
- **Phase 4:** Prebuilt widgets (task list, Kanban).
- **Phase 5:** Sandboxed HTML widgets (iframe, permissions, source versioning).
- **Phase 6:** Tasks, reminders, and scheduling.
- **Phase 7:** Telegram integration (account linking, commands, webhook).
- **Phase 8:** Markdown core files (editing, assistant context loading).
- **Phase 9:** Polish, QA, launch preparation.

Each phase lists:
- Completed tasks (checked).
- In-progress tasks.
- Blocked tasks and why.
- Dependencies between tasks.

### PIPELINE.md

**File:** `docs/implementation/PIPELINE.md`

Documents the development pipeline and conventions:

- **Branch strategy:** Feature branches from `main`.
- **Commit conventions:** What goes in a commit message.
- **PR process:** When to open a PR, what checks must pass.
- **Deployment pipeline:** Local → Dokploy test deploy → production.

### DEFINITION_OF_DONE.md

**File:** `docs/implementation/DEFINITION_OF_DONE.md`

Defines what "done" means for any implementation task:

1. Code compiles (`tsc --noEmit` passes).
2. Lint passes (`npm run lint`).
3. Tests pass (`npm test`).
4. Build passes (`npm run build`).
5. Documentation updated (affected docs reflect new behavior).
6. `TODO.md` status updated.
7. `CURRENT_STATUS.md` inventory updated.
8. `SESSION_HANDOFF.md` written.
9. Manual QA performed (if UI/UX change).

---

## Docs/QA — Testing Strategy

**Directory:** `docs/qa/`

### MANUAL_QA.md

**File:** `docs/qa/MANUAL_QA.md`

A comprehensive checklist of manual testing flows:

- **Auth flows:** Signup, login, session persistence, logout, protected routes.
- **Board flows:** Create, search, select, template creation, navigate sub-boards.
- **Canvas flows:** Create items, move, resize, edit, delete, copy, undo (Ctrl+Z).
- **Assistant flows:** Chat, tool calls, multi-step operations, error handling, canvas refresh.
- **Widget flows:** Insert task list, insert Kanban, preview before insert.
- **Task flows:** Create, mark complete, list, filter.
- **Telegram flows:** Account linking, `/boards`, `/tasks`, `/newboard`, `/addnote`.
- **Mobile UX flows:** Small screen layout, touch interactions, bottom sheets.
- **Theme flows:** Light/dark toggle, persistence across sessions.

Each flow includes:
- **Steps** to reproduce.
- **Expected behavior.**
- **Known issues** (if any).

### TESTING_STRATEGY.md

**File:** `docs/qa/TESTING_STRATEGY.md`

Documents the multi-layered testing approach:

1. **Unit tests** (Vitest, co-located, 58 tests): Validates logic, validation, tool registry.
2. **Type checking** (`tsc --noEmit`): Validates type safety across the codebase.
3. **Linting** (ESLint + Prettier): Validates code style and accessibility.
4. **Build verification** (`next build`): Validates compilation and bundling.
5. **Documentation integrity** (`docs:check`): Validates cross-references.
6. **Database validation** (`db:validate`, `db:smoke`): Validates schema and connectivity.
7. **Manual QA** (`MANUAL_QA.md`): Validates user-visible behavior.

**Not yet implemented:** E2E tests (Playwright/Cypress), visual regression tests, load/stress tests.

---

## PLAN.md — Current Implementation Focus

**File:** `PLAN.md` (66 lines)

A focused work plan for the current implementation phase. Unlike `TODO.md` (which is the master backlog), `PLAN.md` is a short-term execution guide:

- **P1 — Next 3 tasks** (completed):
  - Task 8: Undo/rollback for canvas changes (done).
  - Task 9: Widget preview before insert (done).
  - Task 10: Wire Telegram webhook (done).

- **P1 — Remaining backlog:** Board links, `organize_board`, `rollback_canvas_change`, Telegram `/remind` and `/summarize`, markdown/rich text/reminders widgets.

- **P2 — Later:** Canvas minimap, grouping/frames, realtime collaboration, OAuth, production deployment, analytics.

`PLAN.md` is the file agents read to determine "what should I work on next?" after `SESSION_HANDOFF.md`.

---

## ADHD.md — Fast Project Reference

**File:** `ADHD.md` (123 lines)

A quick-reference document designed for rapid context restoration:

- **What is this?** One-sentence description.
- **Current state.** One-paragraph status summary.
- **Start the app in 3 steps.** Three bash commands.
- **Critical env vars.** Table of variables and values.
- **Key routes.** Table of URLs and what they do.
- **Key files.** Table of files and why they matter.
- **Run checks before committing.** Combined command.
- **Next tasks (P1).** Bullet list.
- **Agent workflow (short version).** Three-step summary.

**Why ADHD.md exists.** When a developer returns to the project after weeks away, reading 5-10 documentation files to remember state is prohibitive. `ADHD.md` provides a 2-minute context restore. It is the first file many developers read when resuming work.

---

## MANIFEST.md — Project Manifest

**File:** `MANIFEST.md` (146 lines)

A full directory tree showing every file in the project structure:

```
visual-ai-whiteboard-agent/
  .env.example
  .gitignore
  .prettierignore
  ADHD.md
  AGENTS.md
  CURRENT_STATUS.md
  ...
  src/
    AGENTS.md
    proxy.ts
    db/
      client.ts
      boards.ts
      canvas-items.ts
      ...
    server/
      assistant/
        board-tools.ts
        canvas-tools.ts
        llm.ts
        tools.ts
      ...
```

**Why MANIFEST.md exists.** It provides a one-glance inventory of every file. This is useful for:
- New developers learning the project structure.
- Agents that need to find a file but don't know its exact path.
- Documentation generators that need a file inventory.

---

## .agent/ — Agent Prompts and Checklists

**Directory:** `.agent/`

### BOOTSTRAP_PROMPT.md

Initialization prompts for new coding agents. Provides the minimum context an agent needs to start working:

- Project name and purpose.
- How to read the AGENTS.md hierarchy.
- Where to find context documents.
- First actions to take.

### CODING_AGENT_PROMPTS.md

Specialized prompts for different types of coding tasks:

- **Feature implementation prompts**: How to add a new assistant tool.
- **Bug fix prompts**: How to diagnose and fix issues.
- **Refactoring prompts**: Safe refactoring patterns.
- **Documentation prompts**: How to update docs correctly.

### SESSION_START_CHECKLIST.md

A checklist for the START phase of the session workflow:
- [ ] Read AGENTS.md.
- [ ] Read README.md.
- [ ] Read CURRENT_STATUS.md.
- [ ] Read SESSION_HANDOFF.md.
- [ ] ... (continues through the START phase tasks).

### SESSION_END_CHECKLIST.md

A checklist for the END phase of the session workflow:
- [ ] Run lint, typecheck, test, build.
- [ ] Update TODO.md.
- [ ] Update CURRENT_STATUS.md.
- [ ] Write SESSION_HANDOFF.md.
- [ ] ... (continues through the END phase tasks).

---

## Documentation Cross-Reference Map

Here is how all documentation files relate to each other:

```
AGENTS.md (root contract)
│
├── README.md (project overview)
├── ADHD.md (fast reference)
├── MANIFEST.md (file inventory)
│
├── CURRENT_STATUS.md (state snapshot) ← updated every session
├── TODO.md (master backlog)            ← updated when tasks change
├── SESSION_HANDOFF.md (last session)   ← replaced every session
├── PLAN.md (short-term plan)           ← updated when priorities shift
│
├── docs/
│   ├── AGENTS.md (docs contract)
│   ├── user-flow-guide.md (testing reference)
│   │
│   ├── architecture/          ← static architecture docs
│   │   ├── SYSTEM_OVERVIEW.md
│   │   ├── DATA_MODEL.md
│   │   ├── CANVAS_ENGINE.md
│   │   ├── ASSISTANT_TOOLS.md
│   │   ├── TELEGRAM_INTEGRATION.md
│   │   ├── WIDGET_RUNTIME.md
│   │   ├── SECURITY_PERMISSIONS.md
│   │   └── TECH_DECISIONS.md
│   │
│   ├── agent-core/            ← runtime behavior files (editable at /core)
│   │   ├── CORE.md
│   │   ├── ASSISTANT.md
│   │   ├── TOOLS.md
│   │   ├── SKILLS.md
│   │   ├── RULES.md
│   │   ├── MEMORY.md
│   │   ├── BOARDS.md
│   │   └── USER_TEMPLATE.md
│   │
│   ├── product/               ← product vision and requirements
│   │   ├── VISION.md
│   │   ├── PRD.md
│   │   ├── MVP_SCOPE.md
│   │   ├── USER_FLOWS.md
│   │   ├── MOBILE_UX.md
│   │   └── NAMING.md
│   │
│   ├── implementation/        ← process and execution
│   │   ├── PHASES.md
│   │   ├── PIPELINE.md
│   │   └── DEFINITION_OF_DONE.md
│   │
│   ├── qa/                    ← testing
│   │   ├── MANUAL_QA.md
│   │   └── TESTING_STRATEGY.md
│   │
│   └── handoffs/              ← handoff templates
│       └── HANDOFF_TEMPLATE.md
│
├── specs/                     ← structural contracts
│   ├── canvas-item.schema.json
│   ├── canvas-tools.schema.json
│   ├── widget-manifest.schema.json
│   ├── widget-manifest.example.json
│   └── permissions.md
│
└── .agent/                    ← agent operating instructions
    ├── BOOTSTRAP_PROMPT.md
    ├── CODING_AGENT_PROMPTS.md
    ├── SESSION_START_CHECKLIST.md
    └── SESSION_END_CHECKLIST.md
```

---

## Documentation Integrity

The `npm run docs:check` command validates that this documentation system is internally consistent:

- All cross-references point to existing files.
- Required files exist in expected locations.
- Key directory structures match expectations.

A failing `docs:check` means a document references a file that has been moved or deleted without updating the reference. This is always fixed before a session ends.
