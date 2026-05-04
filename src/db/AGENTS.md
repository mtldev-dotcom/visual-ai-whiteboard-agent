# Database Code Contract

This folder owns database client setup and typed persistence helpers.

Rules:

- Keep Prisma schema changes in `prisma/schema.prisma`.
- Keep domain helpers small and typed.
- Do not bypass validation or permission checks in future write paths.
- Do not log connection strings, query parameters containing secrets, or user-private payloads.
- Update architecture docs when models or persistence behavior changes.
