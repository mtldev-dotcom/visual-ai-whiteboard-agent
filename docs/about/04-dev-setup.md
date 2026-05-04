# 04 — Development Setup

This guide covers everything needed to get the project running locally, from zero to a working dev environment.

## Prerequisites

- **Node.js 20+** — use `node --version` to verify. The project is tested on Node 20 and 22.
- **Docker** — for running PostgreSQL locally via `docker compose`.
- **An OpenRouter API key** (optional) — from [openrouter.ai](https://openrouter.ai). If you don't have one, use `LLM_PROVIDER=local` during development.

## Step 1 — Start the Database

```bash
docker compose up -d postgres
```

This starts a PostgreSQL 17 Alpine container named `visual-ai-whiteboard-postgres`. It:
- Maps port `5444` on localhost to `5432` inside the container (avoids conflicts with any local Postgres on the default port)
- Creates a database named `visual_whiteboard_ai`
- Creates a user `visual_whiteboard` with password `visual_whiteboard_dev`
- Mounts a persistent Docker volume for data survival across restarts
- Includes a healthcheck using `pg_isready`

Verify it's running:

```bash
docker compose ps
```

## Step 2 — Install Dependencies

```bash
npm install
```

This installs all npm packages **and** runs `postinstall: "prisma generate"`, which generates the typed Prisma client in `src/generated/prisma/`. If the generation fails (e.g., DATABASE_URL isn't set), you can run it manually after setting up `.env.local`.

## Step 3 — Configure Environment

Copy the example file and fill in the required variables:

```bash
cp .env.example .env.local
```

### Required Variables

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://visual_whiteboard:visual_whiteboard_dev@localhost:5444/visual_whiteboard_ai` | Points to the Docker Postgres instance |
| `AUTH_SECRET` | generate with `openssl rand -base64 32` | Used by NextAuth to encrypt JWT sessions |
| `NEXTAUTH_URL` | `http://localhost:3000` | Base URL for NextAuth redirects |

### LLM Provider Variables

| Variable | Value | Notes |
|---|---|---|
| `LLM_PROVIDER` | `local` or `openrouter` | `local` is the deterministic stub (no API key needed) |
| `OPENROUTER_API_KEY` | `sk-or-v1-...` | Required only if `LLM_PROVIDER=openrouter` |
| `OPENROUTER_MODEL` | `anthropic/claude-3-haiku` | Any model available on OpenRouter. Defaults to Claude 3 Haiku |

### Optional Variables

| Variable | Value | Notes |
|---|---|---|
| `APP_SIGNUP` | `enable` or `disable` | Set to `disable` to block new account creation while keeping login available |
| `APP_URL` | `http://localhost:3000` | Public URL of the app (used in OpenRouter headers and Telegram webhook) |
| `TELEGRAM_BOT_TOKEN` | from BotFather | Required for Telegram integration |
| `TELEGRAM_WEBHOOK_SECRET` | random string | Validates incoming webhook requests from Telegram |
| `SCHEDULER_SECRET` | random string | Authenticates internal scheduled jobs |
| `NODE_ENV` | `development` | Controls HMR behavior and global Prisma caching |

## Step 4 — Apply Migrations and Start

```bash
npx prisma migrate dev
npm run dev
```

`prisma migrate dev` applies all pending migrations to your local database. It also regenerates the Prisma client automatically.

`npm run dev` starts the Next.js development server with hot module replacement. Open `http://localhost:3000`.

On first run:
1. Go to `/signup` and create an account
2. You'll be redirected to the main workspace — an onboarding board is auto-seeded with sticky notes, task list, and Kanban items
3. The assistant chat is on the right (desktop) or in a bottom sheet (mobile)

## All npm Scripts

### Development

| Command | What It Does |
|---|---|
| `npm run dev` | Start Next.js development server on `http://localhost:3000` |
| `npm run build` | Production build: `next build` — runs TypeScript checks, bundles, and optimizes |
| `npm run start` | Start the production server (after `npm run build`) |
| `npm run start:deploy` | Runs `prisma migrate deploy` then `next start -H 0.0.0.0` — used in Docker entrypoint |

### Code Quality

| Command | What It Does |
|---|---|
| `npm run lint` | Run ESLint across the project using the Next.js flat config |
| `npm run format` | Format all files with Prettier (`prettier . --write`) |
| `npm run format:check` | Check formatting without modifying files (`prettier . --check`) — used in CI |
| `npm run typecheck` | Run TypeScript compiler in no-emit mode (`tsc --noEmit`) — catches type errors without producing output |
| `npm test` | Run all Vitest tests (`vitest run --passWithNoTests`) |

### Documentation

| Command | What It Does |
|---|---|
| `npm run docs:check` | Runs `scripts/check-docs.mjs` — validates that docs references are consistent and required files exist |

### Database

| Command | What It Does |
|---|---|
| `npm run db:generate` | `prisma generate` — regenerate the typed Prisma client from the schema |
| `npm run db:format` | `prisma format` — format the schema file according to Prisma conventions |
| `npm run db:validate` | `prisma validate` — check the schema for structural errors without hitting the database |
| `npm run db:smoke` | Runs `tsx scripts/db-smoke.ts` — a smoke test that connects to the database, runs a query, and reports success/failure |

### Telegram

| Command | What It Does |
|---|---|
| `npm run telegram:webhook` | Runs `tsx scripts/register-telegram-webhook.ts` — registers `APP_URL/api/telegram/webhook` as the webhook URL with Telegram using `TELEGRAM_BOT_TOKEN` |

### The `tsx` Runner

Several scripts use `tsx` (`tsx@^4.21.0`) — a fast TypeScript execution engine that runs `.ts` files directly without pre-compilation. This is used for database smoke tests and Telegram webhook registration, where running the full Next.js build would be wasteful.

## Common Issues

### "DATABASE_URL is required before using the database"

The Prisma client throws this when `DATABASE_URL` isn't set. Make sure your `.env.local` file exists and contains the variable. Restart `npm run dev` after adding it.

### "prisma:warn Prisma Client was generated but couldn't be found"

Run `npm run db:generate` manually. This happens when `postinstall` runs before `.env.local` is configured.

### Port 5444 already in use

```bash
docker compose ps
# If another container is using the port:
docker compose down && docker compose up -d postgres
```

### Docker is not running

Start Docker Desktop (Windows/Mac) or the Docker daemon (Linux). Verify with `docker ps`.
