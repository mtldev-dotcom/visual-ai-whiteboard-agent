# Agent Operating Contract

This `AGENTS.md` file is the root operating contract for AI agents working in this repository.

Agents must treat this file as authoritative. It defines how to understand the project, how to safely modify code, how to preserve architecture, and how to keep documentation synchronized with implementation.

## 0. Product North Star

This project is a **mobile-first AI whiteboard assistant**.

The assistant is not just a chat panel. It is the main operator of a visual workspace. It can:

- Chat with the user from web UI and Telegram.
- Create boards and sub-boards.
- Add, edit, move, group, and summarize canvas objects.
- Create diagrams, notes, task lists, reminders, browser embeds, and custom HTML widgets.
- Use Markdown core files as its durable operating context.
- Keep work organized, explainable, reversible, and safe.

Every implementation decision should support this final goal.

## 1. Read Before Editing

Before making changes, agents must:

- Read this root `AGENTS.md`.
- Read `README.md`.
- Read `CURRENT_STATUS.md`.
- Read `SESSION_HANDOFF.md`.
- Read `TODO.md`.
- Read the nearest `AGENTS.md` file inside the directory being edited, if one exists.
- Review related docs such as `docs/`, architecture notes, product specs, API contracts, and existing code patterns.
- Prefer following existing project conventions over introducing new ones.

If a local `AGENTS.md` conflicts with this root file, the more specific/local file wins for that directory, unless it violates a global rule such as security, data integrity, or privacy.

## 2. Folder-Level Ownership

Important directories should include their own `AGENTS.md`.

Each local `AGENTS.md` should explain:

- What the folder owns.
- Which files are important.
- What patterns must be preserved.
- What APIs, state, data models, or UI contracts exist.
- What should not be edited from that folder.
- What tests or checks are required after changes.
- What docs must be updated when behavior changes.

The closer an `AGENTS.md` file is to the code, the more specific and technical it should be.

## 3. Change Discipline

Agents must make the smallest correct change that solves the task.

Do not rewrite large areas of the app unless explicitly required.

Do not introduce new frameworks, state libraries, styling systems, database layers, build tools, or architectural patterns without clear justification.

Before adding new code, agents should check whether the project already has:

- A similar component.
- A helper function.
- A service/module pattern.
- A design token or style utility.
- An existing API/client abstraction.
- Existing tests that can be extended.

Prefer extending existing systems over creating parallel ones.

## 4. Documentation Must Stay in Sync

Whenever code behavior changes, agents must update the relevant documentation in the same session.

Update documentation when changing:

- User-facing behavior.
- Public APIs.
- Database schema or data models.
- Environment variables.
- Auth, permissions, or security boundaries.
- Agent/tool behavior.
- UI flows.
- Setup, deployment, or testing steps.
- Major architectural assumptions.

Documentation updates should be close to the affected code. Update the nearest `AGENTS.md` if the change affects folder-level rules or ownership.

## 5. Agent Traceability

Agents should leave the codebase easier to understand than they found it.

When making meaningful changes:

- Keep commits/patches focused.
- Add comments only where they clarify non-obvious logic.
- Avoid noisy comments that restate the code.
- Preserve naming consistency.
- Remove dead code when it is clearly obsolete.
- Do not hide important behavior in magic constants or undocumented side effects.

## 6. Testing Expectations

Agents must run or recommend the most relevant checks for the change.

Prefer targeted checks first, then broader checks when needed.

Common checks may include:

- Type checks.
- Unit tests.
- Integration tests.
- End-to-end tests.
- Linting.
- Formatting.
- Build verification.
- Manual QA flows.

If a check cannot be run, agents must state that clearly in `SESSION_HANDOFF.md` and explain what should be run by a human.

## 7. Safety, Security, and Data Integrity

Agents must be conservative around security and user data.

Do not:

- Expose secrets, tokens, API keys, or private environment values.
- Weaken authentication or authorization.
- Bypass validation.
- Remove rate limits or safety checks without replacement.
- Log sensitive user data.
- Make destructive data changes without explicit instruction.
- Silently change persistence formats or migrations.
- Allow generated HTML widgets to execute with broad privileges.
- Give iframe widgets unrestricted network, storage, filesystem, or tool access by default.

Any change affecting security, permissions, billing, user data, generated code, external integrations, or generated HTML widgets requires extra care and documentation.

## 8. UX and Product Consistency

Agents must preserve the product’s intended user experience.

Before changing UI or flows, check existing:

- Design system rules.
- Component patterns.
- Layout conventions.
- Mobile behavior.
- Accessibility expectations.
- Loading, empty, and error states.
- Copywriting tone.
- Navigation patterns.

New UI should feel native to the existing app, not like a separate product.

The app must be **extremely mobile friendly**. Desktop whiteboard patterns must not be blindly squeezed into mobile screens.

## 9. Environment and Configuration

Agents must not assume hidden configuration.

When adding or changing environment variables:

- Document the variable.
- Explain whether it is required or optional.
- Provide a safe example value when possible.
- Update `.env.example` or equivalent files.
- Avoid hardcoding secrets or environment-specific values.

## 10. Agent Behavior Rules

Agents working in this repository should behave like careful maintainers.

They should:

- Understand before editing.
- Prefer simple solutions.
- Preserve existing architecture.
- Keep documentation current.
- Make changes easy to review.
- Avoid speculative rewrites.
- Ask for clarification only when the task cannot be safely completed with the available context.
- Be explicit about uncertainty, skipped checks, or assumptions.
- Always update `CURRENT_STATUS.md` and `SESSION_HANDOFF.md` after meaningful work.

The goal is not just to make the requested change. The goal is to keep the app coherent, maintainable, and safe for future agents and human developers.

## 11. Required Session Workflow

Every coding session must follow this workflow:

### Start

1. Read:
   - `AGENTS.md`
   - `README.md`
   - `CURRENT_STATUS.md`
   - `SESSION_HANDOFF.md`
   - `TODO.md`
   - Relevant `docs/`
   - Nearest local `AGENTS.md`
2. Identify the exact task.
3. State assumptions and risks.
4. Write a short implementation plan before editing.

### During Work

1. Make the smallest useful change.
2. Keep code, docs, and tests aligned.
3. Do not start unrelated refactors.
4. If the task reveals missing architecture docs, create or update them.

### End

1. Run the most relevant checks.
2. Update docs that changed behavior depends on.
3. Update `TODO.md` task status.
4. Update `CURRENT_STATUS.md`.
5. Replace `SESSION_HANDOFF.md` with a clear handoff:
   - What changed.
   - Files touched.
   - Checks run.
   - Checks skipped.
   - Known issues.
   - Next recommended task.

## 12. Board and Canvas Architecture Rules

Canvas state must be structured and persistent.

Do not store the board as an opaque screenshot or HTML blob.

Canvas items should have:

- Stable ID.
- Board ID.
- Type.
- Position.
- Size.
- Content payload.
- Style payload.
- Metadata.
- Created/updated timestamps.
- Created-by marker: user, assistant, system, import.
- Permission/safety metadata when relevant.

Assistant canvas tools must operate on structured objects.

## 13. Generated HTML Widget Rules

Generated custom HTML widgets are powerful and risky.

Agents must implement or preserve these constraints:

- Widgets run in sandboxed iframes.
- Widgets do not receive unrestricted app access.
- Widget permissions are explicit.
- Widget state is isolated unless intentionally connected to board state.
- Network access is disabled by default or controlled by policy.
- Tool access from widgets is disabled by default or mediated by a permission gateway.
- Widget source should be versioned so changes can be inspected and rolled back.
- User-visible warnings or confirmation are required before running high-risk widgets.

## 14. Telegram Integration Rules

Telegram is a control surface, not a separate product.

Telegram must support quick capture and commands such as:

- Create note.
- Create task.
- Create reminder.
- Create board.
- Add image/file to board.
- Summarize board.
- Send daily task summary.

Telegram actions that modify persistent data must go through the same permission and audit model as web actions.

## 15. Markdown Core Files Rules

The assistant should have editable Markdown operating files under `docs/agent-core/`.

These files are not decorative. They define the assistant behavior model and should be kept aligned with implemented tools and features.

When agent behavior, tool permissions, skills, or memory structure changes, update the relevant core file.
