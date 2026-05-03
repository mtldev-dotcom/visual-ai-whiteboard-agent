# Agent Development Pipeline

## Standard pipeline

1. Pick a task from `TODO.md`.
2. Read relevant docs.
3. Write short plan.
4. Implement smallest correct change.
5. Add or update tests.
6. Run targeted checks.
7. Run broader checks when appropriate.
8. Update docs.
9. Update `TODO.md`.
10. Update `CURRENT_STATUS.md`.
11. Update `SESSION_HANDOFF.md`.

## Branch discipline

If using git:

- Keep changes focused.
- Use meaningful branch names.
- Avoid mixing unrelated work.
- Commit docs with code changes that require them.

Example branch names:

- `phase-0-app-skeleton`
- `phase-1-board-model`
- `phase-3-create-board-tool`
- `phase-5-widget-sandbox`

## Documentation discipline

Docs are part of the implementation.

Code is not complete until docs are updated.

## Handoff discipline

Every session must leave enough context for another agent to continue without guessing.

Minimum handoff:

- Summary.
- Files changed.
- Checks run.
- Checks skipped.
- Known issues.
- Next task.
