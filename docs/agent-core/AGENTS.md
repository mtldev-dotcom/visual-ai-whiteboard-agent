# Agent Core Docs Contract

This folder owns Markdown core files that define the assistant's behavior.

Update these files when changing:

- Assistant personality.
- Tool availability.
- Skill definitions.
- Board behavior.
- Memory rules.
- Permission rules.
- Integration behavior.

These files should stay aligned with actual implemented features.

## Update rules

Update core files in the same session as behavior changes:

- `CORE.md` when the assistant operating model, product framing, or durable context contract changes.
- `ASSISTANT.md` when assistant voice, decision policy, or interaction behavior changes.
- `TOOLS.md` when assistant tools or Telegram command surfaces are added, removed, renamed, or materially changed.
- `SKILLS.md` when assistant skill categories or implemented skill behavior changes.
- `RULES.md` when safety, permissions, audit, confirmation, or data-integrity rules change.
- `MEMORY.md` when memory capture, summarization, retention, or review behavior changes.
- `BOARDS.md` when board organization conventions, board index behavior, or board-summary conventions change.
- `USER_TEMPLATE.md` when user profile fields or onboarding context expectations change.

Do not list aspirational tools as implemented. If a file mentions planned behavior, label it clearly as planned.

Core file edits are user-visible assistant behavior changes. Keep them concise, accurate, and synchronized with `docs/architecture/` and `TODO.md`.
