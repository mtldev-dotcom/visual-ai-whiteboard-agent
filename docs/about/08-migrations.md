# 08 — Migrations

Prisma migrations are the mechanism that keeps the PostgreSQL database schema synchronized with the `prisma/schema.prisma` file. The project has 7 migrations covering all 14 models.

## Migration Files

All migrations live in `prisma/migrations/` in timestamped folders:

```
prisma/migrations/
  20260503223405_init/
  20260503225609_widget_data_model/
  20260503230036_tasks_reminders/
  20260503233701_telegram_account_linking/
  20260503234544_audit_events/
  20260504002441_user_model/
  20260504194248_chat_threads/
```

Each folder contains a `migration.sql` file with the raw SQL that Prisma generated for that migration. These files are auto-generated and should not be manually edited.

## Migration Lifecycle

### During Development: `prisma migrate dev`

When you modify `prisma/schema.prisma` and run:

```bash
npx prisma migrate dev
```

Prisma:
1. Reads the current schema
2. Compares it to the database's migration history
3. Generates a new migration SQL file (with a timestamped folder name)
4. Applies the migration to the development database
5. Regenerates the Prisma client

If the migration cannot be applied without data loss (e.g., removing a required column), Prisma warns you and asks for confirmation. For development, this is usually fine — you're working with test data.

### In Production: `prisma migrate deploy`

```bash
npx prisma migrate deploy
```

This is the production-safe command. It:
1. Reads the migration history from the `_prisma_migrations` table in the database
2. Applies only migrations that haven't been applied yet
3. Does **not** generate new migration files
4. Does **not** regenerate the client (assumes it was generated during the build)
5. Does **not** ask for confirmation or attempt destructive operations without explicit approval

The project's `Dockerfile` entrypoint uses:

```json
"start:deploy": "prisma migrate deploy && next start -H 0.0.0.0"
```

This means the container runs migrations on startup, then starts the Next.js server.

### Client Generation: `prisma generate`

```bash
npx prisma generate
```

This reads `prisma/schema.prisma` and generates the fully typed client into `src/generated/prisma/`. It does not touch the database. It's run:
- Automatically on `npm install` (via `postinstall`)
- Manually via `npm run db:generate` when the schema changes

The generated client includes TypeScript types for every model, relation, query argument, and result. This is what powers the `PrismaClient` import throughout `src/db/`.

## Migration History

### 1. `20260503223405_init` — Initial Schema

Created tables: `Workspace`, `Board`, `CanvasItem`

This was the foundation. The `CanvasItem` table included all four JSON columns (`content`, `style`, `metadata`, `safetyMetadata`) and the `deletedAt` soft-delete column from day one. The architectural vision of "structured canvas objects, not screenshots" was encoded in the very first migration.

Indexes created: `Workspace(ownerUserId)`, `Board(workspaceId)`, `Board(parentBoardId)`, `CanvasItem(workspaceId)`, `CanvasItem(boardId)`, `CanvasItem(type)`

Foreign keys with cascade deletes from Board to Workspace and CanvasItem to Workspace/Board.

### 2. `20260503225609_widget_data_model` — Widget System

Created tables: `WidgetDefinition`, `WidgetInstance`, `CustomHtmlWidgetSource`

Added the widget library infrastructure. The `WidgetInstance` table links widgets to boards and canvas items with cascade deletes and a `Restrict` constraint on deleting definitions.

### 3. `20260503230036_tasks_reminders` — Task Management

Created tables: `Task`, `Reminder`

Added cross-board task tracking with priority levels and due dates. The `Reminder` table was designed for a future job scheduler with its `remindAt` index and `scheduled` status filter.

### 4. `20260503233701_telegram_account_linking` — Telegram Integration

Created tables: `TelegramLinkToken`, `TelegramAccount`

Enabled the secure token-based account linking flow. The `tokenHash` column is `@unique` — only the hash is stored. The `ownerUserId` on TelegramAccount is `@unique` (one link per user) and `telegramUserId` is also `@unique` (one link per Telegram account).

### 5. `20260503234544_audit_events` — Audit Trail

Created table: `AuditEvent`

Added the immutable audit log. The composite index on `[targetType, targetId]` was included from the start for efficient "what happened to this item?" queries.

### 6. `20260504002441_user_model` — User Authentication

Created table: `User`

Added the user model with CUID primary key, unique email, bcrypt `passwordHash`, and optional `name`. The `onDelete: Cascade` from Workspace to User was applied retroactively.

### 7. `20260504194248_chat_threads` — Persistent Chat

Created tables: `ChatThread`, `ChatMessage`

Enables persistent chat history per board. Messages are stored after each turn so chat context is restored when switching boards or refreshing.

## Schema Validation

Before creating or applying migrations, you can validate the schema:

```bash
npm run db:validate
# or
npx prisma validate
```

This checks for:
- Syntax errors in the Prisma schema
- Missing or contradictory relations
- Invalid field types
- Unsupported database features for the PostgreSQL provider

It does **not** check the database — it's a structural validation of the `.prisma` file itself.

## Schema Formatting

Prisma has a canonical schema style. You can auto-format:

```bash
npm run db:format
# or
npx prisma format
```

This indents fields consistently, aligns comments, and orders blocks in the standard Prisma convention. It's recommended to run this before committing schema changes.

## Adding a New Model

The workflow for adding a new database model:

1. Add the model definition to `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name descriptive_name`
3. Review the generated `migration.sql` in the new folder
4. Create a helper file in `src/db/` for the new model
5. Update `src/db/` index file (if one exists)
6. Add API routes if needed
7. Update `CURRENT_STATUS.md` (line count of schema has changed)
8. Create an API route in `src/app/api/` if the model needs a REST endpoint
9. Write tests

## Rolling Back

Prisma does not have a built-in `migrate down` or `migrate rollback` command. To undo a migration:
1. Delete the migration folder from `prisma/migrations/`
2. Manually revert the database table (or restore from a backup)
3. Re-run `npx prisma migrate dev`

Or, if the migration has already been applied:
1. Write a new migration that reverts the changes (e.g., `DROP TABLE` if adding was the change)
2. Run `npx prisma migrate dev --name revert_previous`

For this project, migrations are small and incremental. Rolling back is typically just dropping the new table and the migration folder.

## Prisma Studio

Prisma Studio is a GUI database browser:

```bash
npx prisma studio
```

It opens a browser window showing all tables with CRUD capabilities. Useful for inspecting data during development.
