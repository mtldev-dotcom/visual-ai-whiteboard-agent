# Docker and Deployment

This chapter explains the Docker-based deployment architecture: the multi-stage `Dockerfile`, the local `docker-compose.yml` for development, and the container environment variable contract.

## Dockerfile — Multi-Stage Build

**File:** `Dockerfile` (51 lines)

The Dockerfile uses a **three-stage build** to minimize the final image size and layer count. Each stage has a specific purpose:

### Stage 1: `deps` — Dependencies and Prisma Client

```dockerfile
FROM node:22-bookworm-slim AS deps
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npx prisma generate
```

**Why this stage exists in isolation:**

1. **`npm ci --ignore-scripts`**: installs production dependencies exactly as specified in `package-lock.json`. The `--ignore-scripts` flag prevents `postinstall` hooks (like the project's own `prisma generate`) from running prematurely — Prisma generation is done explicitly in the next step.

2. **OpenSSL and CA certificates**: installed via `apt-get`. Prisma's PostgreSQL driver (`@prisma/adapter-pg`) requires OpenSSL at runtime for TLS connections. Installing it here means the `runner` stage can copy the Prisma client without needing its own `apt-get` for build-time dependencies.

3. **Prisma client generation**: runs `prisma generate` with only the schema and config files. This produces the generated client at `src/generated/` (configured in `prisma.config.ts`). Generating it early means it becomes a cached layer — re-running the build doesn't regenerate the client unless the schema changes.

4. **Telemetry disabled**: `NEXT_TELEMETRY_DISABLED=1` prevents Next.js from sending anonymized usage data during the build. This is set in every stage for consistency.

### Stage 2: `builder` — Next.js Production Build

```dockerfile
FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build

COPY --from=deps /app/node_modules ./node_modules
COPY . .
COPY --from=deps /app/src/generated ./src/generated
RUN npm run build
```

**Key design decisions:**

1. **`DATABASE_URL` placeholder**: Next.js sometimes validates database connectivity during `next build` (for pages that use `generateStaticParams` or `generateMetadata` with database calls). The placeholder `DATABASE_URL` satisfies the connection string format without requiring an actual database during the Docker build.

2. **node_modules copied from `deps`**: avoids running `npm ci` twice. The production dependencies from Stage 1 are reused. If the builder stage needs dev dependencies (for type checking or code generation), those must be installed here — but in this project, `npm run build` works with the production node_modules already present.

3. **Generated Prisma client copied from `deps`**: the `src/generated/` directory (output of `prisma generate`) is copied from Stage 1. This ensures that the builder uses the same Prisma client that was generated from the schema, avoiding version mismatches.

4. **`.next` output**: `next build` produces the `.next/` directory containing the compiled server and client bundles, static files, and route manifests.

### Stage 3: `runner` — Production Runtime

```dockerfile
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/docs/agent-core ./docs/agent-core

EXPOSE 3000
CMD ["npm", "run", "start:deploy"]
```

**What the runner contains and why:**

| Copied artifact | Purpose |
|---|---|
| `package.json`, `package-lock.json` | npm needs these to run `start:deploy` |
| `node_modules` | All runtime dependencies |
| `prisma/` (schema + migrations) | `prisma migrate deploy` needs these |
| `prisma.config.ts` | Prisma configuration for client generation |
| `next.config.ts` | Next.js configuration (may be needed at runtime) |
| `public/` | Static assets (favicon, images) |
| `.next/` | Compiled application |
| `src/generated/` | Generated Prisma client |
| `docs/agent-core/` | **Assistant runtime context files** — critical |

**Why `docs/agent-core` is in the runtime image.** The assistant loads Markdown core files (`CORE.md`, `ASSISTANT.md`, `TOOLS.md`, `SKILLS.md`, `RULES.md`) as its operating context during each chat session. These files are plain Markdown that the assistant reads from disk. Without them in the production image, the assistant would have no knowledge of its own behavior rules, available tools, or memory.

This is a deliberate architectural choice: the assistant's behavior is editable, version-controlled Markdown, not hardcoded in the source. The Docker image must carry these files.

**OpenSSL reinstallation.** OpenSSL is installed again in the runner because each stage is isolated — the runner starts from a clean `node:22-bookworm-slim` base image. Prisma needs OpenSSL at runtime for TLS database connections.

**Port and environment:**
- `NODE_ENV=production`: activates Next.js production optimizations (disabled dev tools, optimized bundles, no hot reload).
- `PORT=3000`: standard Next.js port. Overridable at container runtime.
- `EXPOSE 3000`: documents the port for Docker networking (does not publish the port).

### The Start Command

```bash
npm run start:deploy
```

Expands to:

```bash
prisma migrate deploy && next start -H 0.0.0.0
```

**Why this ordering:**

1. `prisma migrate deploy` runs first — it applies all pending database migrations. If this fails (e.g., bad `DATABASE_URL`, migration conflicts), the container exits with an error. The app never starts with a mismatched database schema.

2. `next start -H 0.0.0.0` starts Next.js bound to all network interfaces. Without `-H 0.0.0.0`, Next.js would only listen on `localhost` inside the container, making it unreachable from Docker's port mapping.

---

## Docker Compose — Local Development Database

**File:** `docker-compose.yml`

```yaml
services:
  postgres:
    image: postgres:17-alpine
    container_name: visual-ai-whiteboard-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: visual_whiteboard_ai
      POSTGRES_USER: visual_whiteboard
      POSTGRES_PASSWORD: visual_whiteboard_dev
    ports:
      - "127.0.0.1:5444:5432"
    volumes:
      - visual_ai_whiteboard_postgres:/var/lib/postgresql/data
    healthcheck:
      test:
        ["CMD-SHELL", "pg_isready -U visual_whiteboard -d visual_whiteboard_ai"]
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  visual_ai_whiteboard_postgres:
```

### Design Decisions

**Postgres 17 on Alpine:**
- Postgres 17 is the latest stable major version with improved performance and JSON capabilities.
- Alpine Linux keeps the image small (~80MB for the base Postgres image).
- The specific version pin (`17-alpine`) prevents unexpected upgrades breaking development.

**Port 5444 → 5432:**
- The container's internal Postgres port (5432) is published to host port 5444.
- **Why 5444:** Port 5432 is the default Postgres port and may already be in use if the developer has a local Postgres installation. Using 5444 avoids conflicts. The `DATABASE_URL` in `.env` references port 5444.

**`127.0.0.1` binding:**
- The port is bound only to `127.0.0.1`, not `0.0.0.0`. This means Postgres is only reachable from the host machine, not from other machines on the network. This is a security best practice for local development.

**Health check:**
- Docker uses `pg_isready` (Postgres's built-in readiness check) every 5 seconds.
- Up to 10 retries with 5-second timeouts means the container has 50 seconds to become healthy before Docker marks it as failed.
- Other services (if added to the compose file) can use `depends_on` with `condition: service_healthy` to wait for the database.

**Named volume:**
- `visual_ai_whiteboard_postgres` persists database data across container restarts and teardowns.
- Data survives `docker compose down` (but not `docker compose down -v`, which deletes volumes).

### Why No App Service in docker-compose.yml

The `docker-compose.yml` only defines the database. The application is run directly on the host (`npm run dev`) during development. This provides:
- Faster iteration: hot reload works without rebuilding a Docker image.
- Full debugging: Node.js inspector works on the host.
- Simpler configuration: no need to mount source code into a container.

The app in Docker Compose would only be added for a full containerized development workflow, which is not currently needed.

---

## Container Environment Variables

The production container must have these environment variables set at runtime:

### Required

| Variable | Purpose | Example |
|---|---|---|
| `NODE_ENV` | Set to `production` (hardcoded in Dockerfile) | `production` |
| `PORT` | Application port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `AUTH_SECRET` | NextAuth encryption secret | (random 32+ character string) |
| `NEXTAUTH_URL` | Public URL for auth callbacks | `https://example.com` |
| `OPENROUTER_API_KEY` | OpenRouter API key for the LLM | `sk-or-...` |
| `OPENROUTER_MODEL` | Model identifier for OpenRouter | `anthropic/claude-3-haiku` |

### Optional

| Variable | Purpose |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Telegram bot token from BotFather |
| `TELEGRAM_WEBHOOK_SECRET` | Shared secret for webhook validation |
| `APP_URL` | Public URL (for Telegram webhook registration) |
| `APP_SIGNUP` | Set to `disable` to block new signups |
| `LLM_PROVIDER` | Set to `local` for stub LLM (dev only) |

### Generating AUTH_SECRET

```bash
openssl rand -base64 32
```

This generates a cryptographically random 32-byte secret encoded as base64. NextAuth uses this to encrypt session cookies and JWT tokens. A weak `AUTH_SECRET` makes sessions forgeable.

### Danger: AUTH_SECRET Default

The local `.env` contains:

```
AUTH_SECRET=dev-auth-secret-replace-in-production
```

**This must be replaced before any production deployment.** The default is documented in `CURRENT_STATUS.md` under "Known risks." Using the default in production allows anyone who knows it to forge session tokens.

---

## Local Development vs. Production

| Aspect | Local dev | Production (Docker) |
|---|---|---|
| Database | `docker compose up -d postgres` | External Postgres (Dokploy, Railway, etc.) |
| App start | `npm run dev` (hot reload) | `npm run start:deploy` (optimized) |
| Port | 3000 | 3000 (configurable via `PORT`) |
| LLM | OpenRouter or `local` stub | OpenRouter (required) |
| Auth secret | Dev value or real secret | Must be a strong random secret |
| Agent core files | `docs/agent-core/` on disk | Copied into the Docker image |
| Health check | `/api/health` | `/api/health` |

---

## Building and Running the Docker Image Locally

### Build

```bash
docker build -t visual-ai-whiteboard-agent .
```

This runs the full multi-stage build. On first run, it may take 2-5 minutes (downloading base images, installing dependencies). On subsequent runs with cached layers, it takes ~30 seconds.

### Run (with local Postgres)

```bash
docker compose up -d postgres
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://visual_whiteboard:visual_whiteboard_dev@host.docker.internal:5444/visual_whiteboard_ai \
  -e AUTH_SECRET=test-secret-change-me \
  -e NEXTAUTH_URL=http://localhost:3000 \
  -e OPENROUTER_API_KEY=your-key \
  -e OPENROUTER_MODEL=anthropic/claude-3-haiku \
  visual-ai-whiteboard-agent
```

**Note:** `host.docker.internal` is used to reach the host's Postgres from inside the container. This works on Docker Desktop (Windows/Mac). On Linux, use `172.17.0.1` or the host's IP address.

### Verify

```bash
curl http://localhost:3000/api/health
```

Expected response:

```json
{ "ok": true, "service": "visual-ai-whiteboard-agent" }
```
