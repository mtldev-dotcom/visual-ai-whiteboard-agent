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

## Project checks

Run these commands when the app skeleton or shared workflow changes:

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run format:check`
- `npm run build`
- `npm run docs:check`
- `npm run db:validate` when Prisma schema changes
- `npm run db:generate` when Prisma schema or client dependencies change
- `npm run db:smoke` when the local database is running

`npm run docs:check` verifies that required workflow docs exist and that `SESSION_HANDOFF.md` keeps the expected handoff sections.

## Local database

Use Docker Compose for local Postgres:

- `docker compose up -d postgres`
- Host port: `5444`
- Development URL: `postgresql://visual_whiteboard:visual_whiteboard_dev@localhost:5444/visual_whiteboard_ai`

Run `npx prisma migrate dev` after schema changes when the local database is available.

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
