# Session Workflow

Every coding session in this project — whether conducted by a human developer or an AI agent — follows a mandatory three-phase workflow. This workflow is defined in `AGENTS.md` §11 and is the single most important process rule in the project. It exists to ensure that every session leaves the repository in a coherent, documented, and reversibly-changed state.

## Why a Formal Workflow?

Without a formal workflow, coding sessions produce:

- **Orphaned changes**: Code modified but docs not updated, leaving future agents confused about what's real.
- **Unstated assumptions**: Changes based on context that was only in the developer's head, not written down.
- **Broken handoffs**: The next session starts blind, wasting time rediscovering state.
- **Drift**: The codebase slowly diverges from its documentation, making it harder to maintain.

The three-phase workflow (Start → During → End) is a lightweight contract that prevents all four failure modes.

---

## Phase 1: START — Context Loading and Planning

Before editing any file, the session must load context and form a plan.

### Step 1.1: Read the Required Documents

Read these files, in this order:

1. **`AGENTS.md`** — The global operating contract. Understand the rules of engagement.
2. **`README.md`** — Project overview, setup, and key commands.
3. **`CURRENT_STATUS.md`** — Inventory of what exists, what doesn't, and known risks.
4. **`SESSION_HANDOFF.md`** — Previous session's summary: what changed, checks run, known issues, next recommended task.
5. **`TODO.md`** — Master backlog with priorities and status.
6. **Relevant `docs/`** — Architecture docs, product specs, or QA flows related to the task.
7. **Nearest local `AGENTS.md`** — Folder-specific conventions for the code being edited.

### Step 1.2: Identify the Exact Task

**Be specific.** "Fix the bug" is not a task. The task should identify:

- **What file(s)** will be edited.
- **What behavior** will change.
- **What the expected outcome** is.
- **What the success criteria** are (e.g., "test passes" or "endpoint returns 200").

Example of a well-formed task:

> Add validation to `add_canvas_item` to reject `type: "notes"`. File: `src/server/assistant/canvas-tools.ts`. Add test in `canvas-tools.test.ts`. Expected outcome: calling the tool with `type: "notes"` returns `{ ok: false, error: "type must be one of: ..." }`. Success: test passes, existing tests still pass, typecheck passes.

### Step 1.3: State Assumptions and Risks

Before coding, articulate:

- **What you assume is true** about the system (e.g., "I assume `boardId` is always a non-empty string", "I assume the user has a valid workspace").
- **What could go wrong** if an assumption is incorrect (e.g., "If `boardId` can be null, the validation will crash").
- **What areas are risky** about the change (e.g., "This change touches the chat route loop — if validation fails silently, the assistant will retry indefinitely").

Stating assumptions forces the session to surface implicit knowledge. If an assumption is wrong, it's caught early rather than at runtime.

### Step 1.4: Write a Short Implementation Plan

The plan should be 3-5 bullet points:

1. Edit `<file>` to add `<change>`.
2. Add test for `<behavior>`.
3. Run lint, typecheck, test, build.
4. Update `<doc>` to reflect the change.

**Why write it down.** Writing a plan forces focus. It prevents scope creep ("while I'm here, let me also refactor X..."). It provides a checklist to verify at the end of the session.

---

## Phase 2: DURING — Disciplined Execution

The implementation phase follows four rules.

### Rule 1: Make the Smallest Correct Change

**Small:** Edit only the lines necessary to accomplish the task. Do not:
- Rewrite a 200-line function when a 5-line fix suffices.
- "Clean up" adjacent code that is not part of the task.
- Reformat files that were not edited.
- Add comments to code you did not change.

**Correct:** The change must satisfy the task's success criteria and pass all existing checks. "It compiles" is not sufficient — the change must be correct in behavior, type-safe, and aligned with conventions.

### Rule 2: Keep Code, Docs, and Tests Aligned

When code changes, two other things must be checked:

- **Docs**: Does any documentation depend on the old behavior? If so, update it in the same session.
  - Example: Changing the allowed types in `add_canvas_item` → update `specs/canvas-tools.schema.json` if the allowed types are documented there.
  - Example: Removing a Telegram command → update `docs/architecture/TELEGRAM_INTEGRATION.md`.
- **Tests**: Does the test suite still pass? If a behavior change breaks a test, update the test — do not delete it unless the behavior is intentionally removed.
  - If adding new behavior, add a new test.

### Rule 3: Do Not Start Unrelated Refactors

Every session has one task. Do not:
- Rename variables in unrelated files.
- Change import patterns across the codebase that are not related to the task.
- Add a new utility function "for future use."
- Fix a bug you noticed in a different module.

**Why this rule exists.** Unrelated refactors create merge conflicts, make code review harder (diff contains multiple unrelated changes), and risk introducing bugs in code you didn't intend to change. If you find something that needs fixing, note it in `SESSION_HANDOFF.md`'s "known issues" or "next recommended task" section — but don't fix it in this session.

### Rule 4: Create or Update Architecture Docs if Needed

If the task reveals a missing piece of architecture documentation, create it:

- Example: You're adding a new tool type and notice that the tool registration pattern isn't documented → create a brief architecture note or update `docs/architecture/ASSISTANT_TOOLS.md`.
- Example: You're wiring a new API route and notice the route structure isn't documented → add it.

This rule is deliberately conservative. Only create docs when the gap directly affects the current task and a future developer would be confused without it.

---

## Phase 3: END — Handoff and Cleanup

The end phase ensures the next session can start without rediscovering state.

### Step 3.1: Run the Most Relevant Checks

The minimum checks for every session:

```bash
npm run lint && npm run typecheck && npm test -- --run && npm run build
```

Additional checks based on what changed:

| If you changed... | Also run... |
|---|---|
| Prisma schema | `npm run db:validate && npm run db:generate` |
| Documentation | `npm run docs:check` |
| Environment variables | Verify `.env.example` is updated |
| UI components | Manual browser check |
| Telegram integration | Manual bot test (if bot is configured) |

If a check **cannot be run** — for example, a browser check requires a running app, but the developer doesn't have a database running — state that clearly in `SESSION_HANDOFF.md`:

```
## Checks skipped
- Browser/manual QA was not run. Database was not available locally.
```

### Step 3.2: Update Affected Documentation

For every documentation file that depends on the changed behavior, verify and update:

- **`TODO.md`**: If a task was completed, mark it `[x]`. If a task was partially completed, mark it `[~]` and add a note.
- **`CURRENT_STATUS.md`**: If the change affects the "What exists" or "What does NOT exist yet" sections, update them. Update "Last updated" date.
- **`ADHD.md`**: If the change affects the "Still missing" or "Next tasks" sections, update them.
- **`specs/`**: If the change affects schema contracts, update the JSON schemas.
- **Folder-level `AGENTS.md`**: If the change affects folder conventions, update the local contract.

### Step 3.3: Replace SESSION_HANDOFF.md

The `SESSION_HANDOFF.md` file must be replaced with a clear, structured handoff containing these sections:

#### Template

```markdown
# Latest Session Handoff

Date: YYYY-MM-DD

## Summary

1-2 sentences describing the high-level change.

## What changed

- Bullet list of specific changes.

## Files touched

- `path/to/file` — what was changed in this file.

## Checks run

- List each check command and result (pass/fail).

## Checks skipped

- List checks not run and why.

## Known issues

- Any issues discovered but not fixed during this session.

## Next recommended task

- The most valuable next task, based on TODO.md priorities and context gained during this session.
```

#### Example from the Project

The current `SESSION_HANDOFF.md` (2026-05-04) demonstrates this template:

```
# Latest Session Handoff

Date: 2026-05-04

## Summary
Removed the duplicate `notes` creation surface...

## What changed
- Removed the Notes toolbar tool and `N` shortcut.
- Removed the Notes widget card from the widget library.
- ...

## Files touched
- `CURRENT_STATUS.md`
- `src/server/assistant/canvas-tools.test.ts`
- `src/server/assistant/canvas-tools.ts`
- ...

## Checks run
- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm test -- --run`: passed, 58 tests
- `npm run docs:check`: passed
- `npm run build`: passed

## Checks skipped
- Browser/manual QA was not run.

## Known issues
- Existing boards may still contain old `notes` canvas items...

## Next recommended task
- Run a quick browser check...
```

**Why the handoff must be complete.** The next session starts by reading `SESSION_HANDOFF.md`. If the handoff is incomplete, the next session:
- Doesn't know what changed.
- Doesn't know what checks passed or failed.
- Doesn't know about known issues.
- Doesn't know what task to pick up.

This breaks the continuity of the development process.

### Step 3.4: Verify the Repository State

After updating documentation, run a final sanity check:

```bash
npm run docs:check
git status
git diff --stat
```

Confirm that:
- Only intended files were modified.
- No stray files were created.
- All documentation files that reference each other still have valid links.

---

## The Complete Workflow in Diagram

```
          START
            │
    ┌───────┼───────┐
    │  Read AGENTS.md │
    │  Read README.md │
    │  Read CURRENT_STATUS.md │
    │  Read SESSION_HANDOFF.md │
    │  Read TODO.md │
    │  Read relevant docs/ │
    │  Read local AGENTS.md │
    └───────┼───────┘
            │
    ┌───────┼───────┐
    │  Identify task │
    │  State assumptions │
    │  Write plan │
    └───────┼───────┘
            │
            ▼
          DURING
            │
    ┌───────┼───────┐
    │  Edit code     │
    │  Update docs   │
    │  Add/update tests │
    │  No refactors  │
    └───────┼───────┘
            │
            ▼
           END
            │
    ┌───────┼───────┐
    │  Run checks    │
    │  Update TODO.md │
    │  Update CURRENT_STATUS.md │
    │  Write SESSION_HANDOFF.md │
    │  Verify repo state │
    └───────────────┘
```

---

## Common Violations and Why They Matter

### Violation: Skipping the Start Phase

**What happens:** Agent jumps directly to editing code without reading `CURRENT_STATUS.md` or `TODO.md`.

**Consequence:** Agent re-implements a feature that already exists, or works on a P3 task while P1 items are unaddressed.

### Violation: Making Unrelated Changes During a Task

**What happens:** While fixing a bug in `canvas-tools.ts`, the agent also renames variables in `board-tools.ts` because they "looked inconsistent."

**Consequence:** The diff is larger and harder to review. The rename might introduce a variable collision. The `SESSION_HANDOFF.md` now describes two unrelated changes under one summary.

### Violation: Not Updating Documentation

**What happens:** Agent adds a new tool but doesn't update `specs/canvas-tools.schema.json` or `CURRENT_STATUS.md`.

**Consequence:** The next session reads the schema and believes the tool doesn't exist. The status inventory is wrong. The documentation drifts from implementation.

### Violation: Incomplete SESSION_HANDOFF.md

**What happens:** Agent writes "fixed stuff" as the handoff summary and doesn't list checks.

**Consequence:** The next session has to reverse-engineer what changed by reading the git diff. Unknown failing checks are not surfaced. Issues discovered during the session are forgotten.

---

## When to Break the Rules

These rules exist to facilitate effective development, not to prevent it. Break them when:

- **The task is a P0 security hotfix** where documentation can be updated after the fix is deployed.
- **The change is trivially cosmetic** (e.g., fixing a typo in an error message) where documentation doesn't depend on it.
- **The task is research/exploration** (e.g., understanding the codebase) where no code is changed.

When breaking a rule, state explicitly in the handoff why the rule was broken and what the path to restoration is:

```
## Deviations from workflow
- Skipped test update because the validation function was renamed, not changed. Tests pass with the new name.
- Documentation update deferred to next session. The change is internal-only and no public contract changed.
```
