# The Agent Operating System

This project is designed to be maintained by both human developers and AI coding agents. The **AGENTS.md hierarchy** is the operating contract that governs how agents discover, understand, and modify the codebase. This chapter explains how it works, why it exists, and how to navigate it.

## The Root AGENTS.md — Authority

**File:** `AGENTS.md` (287 lines, project root)

The root `AGENTS.md` is the highest authority in the project. Every agent session begins by reading this file. It defines:

- **Product North Star**: This is a mobile-first AI whiteboard assistant. Every implementation decision must support this goal.
- **Change discipline**: Smallest correct change, no speculative rewrites, extend existing systems.
- **Safety constraints**: No exposing secrets, no weakening auth, no bypassing validation.
- **Documentation rules**: Docs must stay in sync with implementation.
- **Session workflow**: A mandatory start/end protocol for every coding session.
- **Architecture rules**: Canvas items must have stable IDs, boards must not be stored as blobs, widgets must be sandboxed.

### The Precedence Rule

The root `AGENTS.md` includes a critical rule about local overrides:

> If a local `AGENTS.md` conflicts with this root file, the more specific/local file wins for that directory, **unless it violates a global rule** such as security, data integrity, or privacy.

This means:

```
Root AGENTS.md says:     "No SQL injection."
Local AGENTS.md says:    "In this folder, we accept raw user input in SQL queries."
Result:                  Local rule is rejected. Security rules are global and cannot be overridden.

Root AGENTS.md says:     "Prefer existing conventions over new patterns."
Local AGENTS.md says:    "This folder uses a builder pattern. Use it here."
Result:                  Local rule wins. Conventions at the folder level are more specific.
```

**Why this hierarchy exists.** A single `AGENTS.md` cannot capture the conventions of every folder. The `src/app/components/` folder has React component rules. The `prisma/` folder has database schema rules. The `src/server/telegram/` folder has messaging integration rules. Each folder's `AGENTS.md` captures domain-specific constraints that the root file would become too bloated to include.

---

## Folder-Level AGENTS.md Inventory

The project has **19 AGENTS.md files** across the codebase:

### Root Level (1)

| File | Scope |
|---|---|
| `AGENTS.md` | Global operating contract. Authority. |

### Source Code (8)

| File | What it owns |
|---|---|
| `src/AGENTS.md` | Source code conventions: prefer typed interfaces, validate tool inputs, mobile-first UX |
| `src/app/AGENTS.md` | Next.js app router rules: pages, layouts, API route structure |
| `src/app/components/AGENTS.md` | React component patterns, state management, mobile layout conventions |
| `src/db/AGENTS.md` | Database helper functions, Prisma query patterns, transaction boundaries |
| `src/server/AGENTS.md` | Server-side logic: keep providers behind interfaces, do not expose secrets to clients |
| `src/server/assistant/AGENTS.md` | LLM provider adapter rules, tool registry behavior, no vendor coupling |
| `src/server/telegram/AGENTS.md` | Telegram command handlers, webhook security, account linking patterns |
| `src/server/widgets/AGENTS.md` | Widget sandboxing, permission model, iframe security constraints |

### Documentation (6)

| File | What it owns |
|---|---|
| `docs/AGENTS.md` | Documentation rules: keep docs practical, update closest doc on behavior change |
| `docs/architecture/AGENTS.md` | Architecture documentation rules |
| `docs/agent-core/AGENTS.md` | Assistant core files: behavior, tools, skills, memory |
| `docs/implementation/AGENTS.md` | Implementation docs: phases, pipeline, definition of done |
| `docs/product/AGENTS.md` | Product docs: PRD, MVP scope, user flows, vision |
| `docs/qa/AGENTS.md` | QA docs: manual QA flows, testing strategy |
| `docs/handoffs/AGENTS.md` | Session handoff templates and conventions |

### Infrastructure (2)

| File | What it owns |
|---|---|
| `prisma/AGENTS.md` | Database schema rules, migration patterns, model conventions |
| `specs/AGENTS.md` | Schema and contract rules: canvas items, tool I/O, widget manifests, permissions |

### Scripts (1)

| File | What it owns |
|---|---|
| `scripts/AGENTS.md` | Script conventions and purpose documentation |

---

## How Specificity Works

Consider a concrete example — the `src/server/telegram/` directory:

**Root `AGENTS.md`** (global):
- "Telegram is a control surface, not a separate product."
- "Telegram actions that modify persistent data must go through the same permission and audit model as web actions."

**`src/server/AGENTS.md`** (server-level):
- "Validate inputs before calling tools or persistence helpers."
- "Do not read secrets outside server-only modules."

**`src/server/telegram/AGENTS.md`** (folder-level):
- Specific rules about command handler structure.
- Patterns for webhook validation.
- Account linking token flow.

When an agent edits `src/server/telegram/commands.ts`, it reads all three files. The most specific file (`telegram/AGENTS.md`) provides concrete patterns (e.g., "command handlers must validate the linked account before executing"). The mid-level file provides server-wide rules (e.g., "do not expose API keys"). The root file provides product-level constraints (e.g., "same audit model as web actions").

**No file contradicts another.** Each level adds detail, not conflict.

---

## The Session Required Reading List

Every coding session must begin by reading these files, in this order:

1. **`AGENTS.md`** — Global operating contract.
2. **`README.md`** — Project overview and setup.
3. **`CURRENT_STATUS.md`** — Current state inventory: what exists, what doesn't, known risks.
4. **`SESSION_HANDOFF.md`** — What the previous session did, checks run, known issues, next task.
5. **`TODO.md`** — Master task backlog with status and priority.
6. **Relevant `docs/`** — Architecture docs, product specs, or QA flows relevant to the task.
7. **Nearest local `AGENTS.md`** — Folder-specific rules for the directory being edited.

This reading list is not optional. It is stated in the root `AGENTS.md` §11 ("Required Session Workflow") and encoded in the agent's system prompt.

### Why This Order

1. `AGENTS.md` establishes the rules of engagement.
2. `README.md` provides the project context and setup instructions.
3. `CURRENT_STATUS.md` provides the "now" snapshot — what the agent can expect to find.
4. `SESSION_HANDOFF.md` provides the "last known state" — what changed, what's broken, what's next.
5. `TODO.md` provides the "future" — what needs to be done, prioritized.
6. `docs/` provides depth — architecture, product, and implementation detail.
7. Local `AGENTS.md` provides precision — folder-specific conventions.

Skipping any of these steps risks making changes that contradict existing architecture, duplicate completed work, or violate folder conventions.

---

## What Each AGENTS.md Should Contain

The root `AGENTS.md` §2 specifies the structure:

> Each local `AGENTS.md` should explain:
> - What the folder owns.
> - Which files are important.
> - What patterns must be preserved.
> - What APIs, state, data models, or UI contracts exist.
> - What should not be edited from that folder.
> - What tests or checks are required after changes.
> - What docs must be updated when behavior changes.

Additionally: "The closer an `AGENTS.md` file is to the code, the more specific and technical it should be."

### A Well-Formed Example: `src/server/assistant/AGENTS.md`

This file is concise and actionable:

```
# Assistant Server Contract

This folder owns assistant runtime interfaces and provider adapters.

Rules:
- Keep LLM providers behind a provider-agnostic adapter.
- Do not couple canvas tools to one model vendor.
- Tool execution must go through a registry with validation and permission checks.
- Keep local/deterministic adapters available for development and tests.
- Do not log prompts that may contain private user data unless explicit debug policy exists.
```

Each rule is specific, testable, and directly applicable to the code in that folder.

---

## When to Create a New AGENTS.md

Create a new folder-level `AGENTS.md` when:

1. **A new directory is created** that contains source code or documentation.
2. **An existing directory's conventions diverge** from the parent's `AGENTS.md`.
3. **A directory has unusual rules** that an agent would not infer from context (e.g., "never import React in this folder" or "always use the Prisma transaction API").

Do **not** create `AGENTS.md` files for:
- Empty directories.
- Directories that contain only generated code.
- Directories with fewer than 3 files and no unique conventions.

---

## The Agent's Perspective

From an AI agent's point of view, the AGENTS.md hierarchy provides:

1. **Context without reading everything.** An agent editing `canvas-tools.ts` doesn't need to read the Telegram integration docs. It reads the root `AGENTS.md`, `src/server/assistant/AGENTS.md`, and the relevant test file.

2. **Guardrails that prevent common mistakes.** "Do not expose secrets to client components" prevents the most frequent Next.js security bug. "Validate inputs before calling tools" prevents the most frequent AI tool-calling bug.

3. **Conventions that make code discoverable.** Knowing that the codebase uses `@/` aliases, Vitest co-located tests, and a tool registry pattern means the agent can find and extend existing systems rather than creating parallel ones.

4. **Accountability.** The `SESSION_HANDOFF.md` workflow ensures every session documents its changes. If a subsequent session discovers a problem, it can trace back to the session that introduced it.

---

## AGENTS.md vs. Implementation Documentation

The AGENTS.md files are **operating contracts**, not **reference documentation**.

| AGENTS.md | Reference docs (in `docs/`) |
|---|---|
| Tells agents *what to do* and *what not to do* | Explains *how the system works* |
| Short, rule-based, prescriptive | Longer, explanatory, descriptive |
| Read at the start of every session | Read as needed for context |
| Lives in the directory it governs | Lives in `docs/` |
| Updated when conventions change | Updated when implementation changes |

Both are necessary. AGENTS.md files prevent mistakes. Reference docs provide the understanding needed to make correct changes.

---

## The Contractual Nature

The AGENTS.md hierarchy functions like a legal contract:

- **Root AGENTS.md** = Constitution. Highest-level principles. Cannot be overridden on security.
- **Folder-level AGENTS.md** = Contracts. Specific rules for specific domains. Can add detail but not contradict higher principles.
- **Nearest AGENTS.md** = Governing law. The most specific applicable contract takes precedence for implementation details.

This structure is intentionally designed so that:
- New folders can define their own conventions without amending the root file.
- Global safety rules (security, privacy, data integrity) cannot be silently weakened.
- Agents always have a clear answer to "what is the right way to do this in this folder?"

## Human Developers and AGENTS.md

Human developers should also follow the AGENTS.md hierarchy. The rules are not just for AI agents:

- Read `SESSION_HANDOFF.md` at the start of a coding session to understand the current state.
- Follow the same change discipline (small changes, no speculative rewrites).
- Update `CURRENT_STATUS.md` and `SESSION_HANDOFF.md` after meaningful work.
- Create folder-level `AGENTS.md` when establishing new subdirectories.

The system works best when both human and AI contributors treat the AGENTS.md hierarchy as the authoritative operating contract.
