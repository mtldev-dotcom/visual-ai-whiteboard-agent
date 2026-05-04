# Prisma Contract

This folder owns the Prisma schema and migrations.

Rules:

- Keep models aligned with `docs/architecture/DATA_MODEL.md`.
- Use explicit timestamps for persistent domain records.
- Do not run migrations against a shared or production database without explicit instruction.
- Prefer `npm run db:validate` and `npm run db:generate` for schema-only changes.
- Document data model changes in architecture docs, TODO, status, and handoff files.
