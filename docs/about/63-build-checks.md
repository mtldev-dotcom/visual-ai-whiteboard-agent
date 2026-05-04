# Build and Integrity Checks

Beyond linting and type checking, the project has a set of integrity checks that validate the build, documentation, database schema, and database connectivity. This chapter explains each check, why it exists, and when to run it.

## `npm run build` — Production Build

```bash
npm run build
```

Runs: `next build`

This is the most comprehensive check in the project. It performs two major operations:

### Phase 1: TypeScript Compilation

Next.js compiles every TypeScript file in the project. This is a superset of `tsc --noEmit` — it verifies that all types are correct AND that the code can be transpiled to JavaScript that Node.js can execute.

**What is checked that `tsc --noEmit` doesn't:**
- Dynamic imports resolve to real modules.
- React Server Components vs. Client Components boundaries are correct (`"use client"` directives).
- Route handler signatures match Next.js expectations.
- Page and layout exports are valid.
- GenerateStaticParams and other Next.js API functions are used correctly.

### Phase 2: Production Bundle

Next.js produces a production-optimized bundle:
- Code splitting at page boundaries.
- Server-side bundles for API routes and server components.
- Client-side bundles with tree shaking and minification.
- Static generation for pages that can be pre-rendered.
- CSS extraction and optimization.

A passing `next build` means the application can start and serve requests in production mode. If `next build` passes but the app fails at runtime, the bug is in runtime logic (e.g., a database query that depends on environment variables), not in the compilation pipeline.

### When to Run

Run `npm run build` as the **final check** before considering a change complete:

```
change → lint → typecheck → test → build
```

Running build last is important because builds are the slowest operation. Fast-fail on lint and typecheck first.

---

## `npm run docs:check` — Documentation Integrity

```bash
npm run docs:check
```

Runs: `node scripts/check-docs.mjs`

This script validates that the project's documentation is internally consistent. It checks:

- **Cross-references**: Links between documentation files point to existing files. A broken `[link](./NONEXISTENT.md)` is caught.
- **Required files exist**: Key documentation files that the AGENTS.md contract requires are present.
- **File structure assertions**: Specific directory structures expected by the build pipeline exist.

**Why this matters.** Documentation is not decorative — the AGENTS.md hierarchy is an executable operating contract for AI agents. If `CURRENT_STATUS.md` is missing or `SESSION_HANDOFF.md` links to a deleted file, agents lose context and make incorrect decisions. `docs:check` catches these consistency errors automatically.

### Current State

```
npm run docs:check
> passed
```

All documentation references are valid. All required files exist. No broken links.

### When to Run

Run `npm run docs:check` after any session that modifies or creates documentation files. This is especially important when:
- Renaming or deleting a documentation file.
- Updating cross-references in `CURRENT_STATUS.md`, `TODO.md`, or `SESSION_HANDOFF.md`.
- Adding a new documentation file that other files should reference.

---

## `npm run db:validate` — Schema Validation

```bash
npm run db:validate
```

Runs: `prisma validate`

Validates the Prisma schema file against the Prisma schema language specification:

**File checked:** `prisma/schema.prisma`

**What it validates:**
- Schema syntax is valid Prisma Schema Language (PSL).
- All models, fields, and relations are well-formed.
- Enums and default values are valid.
- Field types are recognized by the Prisma schema parser.
- Relation references point to existing models and fields.

**What it does NOT validate:**
- Whether the schema matches the actual database (that requires `prisma db push --dry-run` or a migration check).
- Whether queries in the codebase match the schema (that's covered by TypeScript + `prisma generate`).
- Whether indexes and constraints are correctly defined (some constraint issues only surface at migration time).

### Why Validation Is Separate from Generation

`prisma validate` checks syntax. `prisma generate` generates the client. These are separate steps because:

1. You can validate a schema without having a database.
2. Schema syntax errors should be caught before attempting generation (which has more complex failure modes).
3. CI can run `prisma validate` as a fast check before the slower `prisma generate`.

### Current State

```
npm run db:validate
> passed
```

The Prisma schema is syntactically valid with all 13 models, relations, and enums correctly defined.

---

## `npm run db:generate` — Client Regeneration

```bash
npm run db:generate
```

Runs: `prisma generate`

Generates the Prisma Client from the schema. The generated client lives at `node_modules/.prisma/client/` and includes:
- Type-safe query builders for every model.
- Relation helpers (`include`, `select`, `connect`, `disconnect`).
- CRUD methods (`create`, `findUnique`, `findMany`, `update`, `delete`, `upsert`).
- Type definitions matching the schema.

This command is also run automatically on `npm install` via the `postinstall` script:

```json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

**Why regenerate after schema changes.** The generated client is a reflection of `schema.prisma`. If you add a field to the schema but don't regenerate, TypeScript will not know about the new field, and any query using it will fail at compile time.

### When to Run

Run `npm run db:generate` after:
- Adding, removing, or renaming a model, field, or relation in `schema.prisma`.
- Changing a field type or default value.
- Pulling schema changes from another branch.

---

## `npm run db:smoke` — Database Connectivity

```bash
npm run db:smoke
```

Runs: `tsx scripts/db-smoke.ts`

A quick smoke test that:
1. Connects to the database using `DATABASE_URL`.
2. Runs `SELECT 1` to verify the connection is alive.
3. Reports success or failure with timing information.

**File:** `scripts/db-smoke.ts`

**Why a separate smoke test instead of a test file.** Database connectivity requires a running Postgres instance. Unit tests (in `*.test.ts` files) are designed to run without any external dependencies. Mixing database-dependent tests with pure unit tests creates flaky CI pipelines. `db-smoke` is intentionally kept as a separate, manual check.

### Running the Smoke Test

The database must be running:

```bash
docker compose up -d postgres
npm run db:smoke
```

**Expected output:**

```
Database connection: OK
Response time: 12ms
```

### Current State

The smoke test passes when Postgres is running and `DATABASE_URL` is correctly configured. It is not part of the automated test suite.

---

## `npm run start:deploy` — Production Start

```bash
npm run start:deploy
```

Runs: `prisma migrate deploy && next start -H 0.0.0.0`

This is the production start command, used by the Docker container. It combines two operations:

1. **`prisma migrate deploy`**: Applies pending database migrations. This is the production-safe migration command — it does not create new migrations and does not prompt for confirmation.
2. **`next start -H 0.0.0.0`**: Starts the Next.js production server on all network interfaces.

**Why combine migration and start in one command.** In a containerized deployment, the container has one lifecycle. If migrations fail, the container should not start serving requests with an out-of-date schema. Running both in the same CMD ensures this ordering.

---

## The Complete Development Workflow

The recommended workflow for any code change follows this pipeline:

### Step 1: Make the Change

Edit files in `src/` or related directories.

### Step 2: Lint

```bash
npm run lint
```

Catches style, accessibility, and structural issues. Fast feedback.

### Step 3: Typecheck

```bash
npm run typecheck
```

Catches type mismatches, missing exports, and incorrect generics.

### Step 4: Test

```bash
npm test
```

Runs 58 unit tests. Verifies that logic and validation behave correctly.

### Step 5: Build

```bash
npm run build
```

Verifies that the entire application compiles and bundles successfully.

### Combined Command

For convenience, the full pipeline is:

```bash
npm run lint && npm run typecheck && npm test -- --run && npm run build
```

This is the command that agents run at the end of every session (documented in `ADHD.md` and `SESSION_HANDOFF.md`).

### Additional Checks (As Needed)

| Scenario | Command |
|---|---|
| Changed Prisma schema | `npm run db:validate && npm run db:generate` |
| Changed documentation | `npm run docs:check` |
| Changed environment or connection | `npm run db:smoke` |
| Before committing | `npm run format` |

---

## Current State of All Checks

As of 2026-05-04, all checks pass:

| Check | Status | Notes |
|---|---|---|
| `npm run lint` | Pass | |
| `npm run typecheck` | Pass | |
| `npm test` | Pass | 58 tests |
| `npm run build` | Pass | |
| `npm run docs:check` | Pass | |
| `npm run db:validate` | Pass | |
| `npm run db:generate` | Pass | |
| `npm run db:smoke` | Pass | Requires postgres container |
| `npm run format` | Pass | |

## CI Pipeline Design

These checks are structured so that a CI pipeline can run them in this order:

```yaml
# Conceptual CI pipeline
steps:
  - npm ci
  - npm run format:check    # Fast, fails first
  - npm run lint            # Fast
  - npm run typecheck       # Moderate
  - npm test                # Fast (all in-memory)
  - npm run build           # Slow, runs last
  - npm run docs:check      # Fast, verifies documentation
  - npm run db:validate     # Fast, verifies schema syntax
```

The ordering optimizes for fast failure — faster checks run first so developers get feedback quickly. The build runs last because it is the most expensive and unlikely to fail if all earlier checks pass.
