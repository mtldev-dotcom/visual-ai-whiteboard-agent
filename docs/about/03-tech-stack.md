# 03 — Technology Stack

Every technology choice in this project serves a specific purpose. Here is the full stack and the reasoning behind each decision.

## Runtime & Language

| Choice | Why |
|---|---|
| **TypeScript** | Full type safety across the entire codebase. Catches mistakes at build time that JavaScript would surface at runtime. The `strict: true` flag in `tsconfig.json` enforces the strictest checking level. |
| **Node.js 20+** | Long-term support, ES module compatibility, and the stability required for production Next.js deployments. |

## Framework

| Choice | Why |
|---|---|
| **Next.js 16** (`next@16.2.4`) | The latest major version. Provides React Server Components, the App Router with `route.ts` API handlers, middleware rewriting, and image optimization — all in one framework. The project uses the `/app` directory structure exclusively. |
| **React 19** (`react@19.2.4`) | Ships with Next.js 16. Provides concurrent rendering, the `use()` hook, improved suspense boundaries, and ref-forwarding improvements used throughout the canvas system. |

## Styling

| Choice | Why |
|---|---|
| **Tailwind CSS v4** | Utility-first CSS with zero-runtime performance cost. Tailwind v4 (installed via `@tailwindcss/postcss`) provides the new CSS-first configuration model and improved dark mode support. The project defines a complete **CSS design token system** using CSS custom properties (`--bg-*`, `--text-*`, `--accent*`, `--border*`, `--shadow-*`, `--canvas-*`) that seamlessly integrates with Tailwind's `dark:` prefix via the `<html class="dark">` class strategy. |

## Database

| Choice | Why |
|---|---|
| **PostgreSQL** (`postgres:17-alpine` in Docker) | A proven relational database with first-class JSONB support. JSONB is critical because many domain models (`CanvasItem`, `WidgetInstance`, etc.) store flexible `content`, `style`, and `metadata` payloads that don't have fixed schemas. |
| **Prisma** (`prisma@^7.8.0`) | Type-safe ORM that generates a fully typed client from the schema. The schema is in a single file (`prisma/schema.prisma`, 281 lines) that is the source of truth for all 14 models. |
| **@prisma/adapter-pg** (`@prisma/adapter-pg@^7.8.0`) | Prisma's native PostgreSQL adapter that uses `pg` connection pooling directly — faster and more reliable than the legacy driver-based approach. |

### Prisma Client Output

The generated Prisma client is output to `src/generated/prisma/` (not the default `node_modules/.prisma/client/`). This is configured in the schema:

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}
```

This makes the client available as an import from `@/generated/prisma/client` via the TypeScript path alias `@/* → ./src/*`. It runs on `postinstall` via `npm run postinstall: "prisma generate"`.

## Authentication

| Choice | Why |
|---|---|
| **NextAuth.js v4** (`next-auth@^4.24.14`) | Mature, well-tested auth library with built-in JWT session support and Next.js App Router compatibility. v4 was chosen over v5 (Auth.js) because v4 is battle-tested in production and v5 broke several established patterns. |
| **bcryptjs** (`bcryptjs@^3.0.3`) | Pure-JavaScript bcrypt implementation. No native compilation required (unlike `bcrypt`), which simplifies Docker builds and cross-platform development. The cost factor is set to 10 (default). |
| **Credentials provider** | Email + password login. The `APP_SIGNUP` environment variable can be set to `"disable"` to block new account creation while keeping login available for existing users. |

## AI / LLM

| Choice | Why |
|---|---|
| **OpenRouter API** | Aggregated API access to hundreds of LLM models (Claude, GPT, Gemini, Llama, etc.) through a single endpoint. The adapter is configured via `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` environment variables. |
| **openai SDK** (`openai@^6.35.0`) | The OpenAI Node.js SDK is used as the HTTP client for OpenRouter. OpenRouter exposes an OpenAI-compatible API (`https://openrouter.ai/api/v1`), so the same `client.chat.completions.create()` method works — just with a different `baseURL`. |
| **Adapter pattern** (provider-agnostic) | The LLM layer is wrapped behind a `LlmAdapter` interface (`src/server/assistant/llm.ts`). This means the assistant runtime doesn't care which provider is behind the interface. The factory function `createLlmAdapter()` reads `LLM_PROVIDER` from the environment and instantiates the correct adapter: |
|   | - `"local"` → `LocalLlmAdapter` — deterministic stub that echoes input (no API key needed, ideal for development and tests) |
|   | - `"openrouter"` → `OpenRouterLlmAdapter` — real LLM via OpenRouter with tool calling support |
|   | Adding a new provider means implementing one class with a `complete()` method — nothing else changes. |

The adapter sends tools using OpenAI's native function-calling format. The assistant core context (loaded from `docs/agent-core/` Markdown files) is included as the system message with every request.

## UI Icons

| Choice | Why |
|---|---|
| **Lucide React** (`lucide-react@^1.14.0`) | Beautiful, consistent icon set with tree-shakeable per-icon imports. Each icon is its own React component, so only used icons are included in the bundle. Used throughout the toolbar, board explorer, task center, and chat panel. |

## Testing

| Choice | Why |
|---|---|
| **Vitest** (`vitest@^4.1.5`) | Fast, native-ESM test runner compatible with Vite (which Next.js 16 uses under the hood). Much faster than Jest for TypeScript projects. Tests are co-located with source files (`*.test.ts`). |

## Code Quality

| Choice | Why |
|---|---|
| **ESLint** (`eslint@^9` + `eslint-config-next`) | Next.js-specific lint rules that catch framework-specific issues (improper `<Link>` usage, missing `alt` attributes on images, server/client component boundaries). Flat config format (ESLint v9 standard). |
| **Prettier** (`prettier@^3.8.3`) | Opinionated code formatter. Zero-config for the project — all files formatted identically regardless of who writes them. `npm run format:check` in CI ensures consistency. |

## Deployment

| Choice | Why |
|---|---|
| **Docker** (`Dockerfile`, `docker-compose.yml`) | Multi-stage Docker build: dependency stage generates Prisma client, builder stage runs `next build`, runtime stage is Node.js 22 Debian slim with OpenSSL for Prisma. The compose file defines just the Postgres service (for local dev, mapped to port `127.0.0.1:5444`). |

## Key Configuration Files

| File | Purpose |
|---|---|
| `package.json` | Dependencies, npm scripts (dev, build, lint, format, typecheck, test, db:*, telegram:webhook) |
| `tsconfig.json` | TypeScript strict mode, path alias `@/* → ./src/*`, bundler module resolution |
| `.env.example` | Template for `.env.local` with all required variables |
| `docker-compose.yml` | Postgres 17 Alpine on port 5444, persistent volume, healthcheck |
| `prisma/schema.prisma` | 14 models, 281 lines, configured to output client to `src/generated/prisma/` |
| `Dockerfile` | Multi-stage build for production deployment |
