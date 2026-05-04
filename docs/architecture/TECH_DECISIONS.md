# Technical Decisions

This file must be updated whenever agents make or change meaningful technology decisions.

## Decision record template

```md
## YYYY-MM-DD — Decision title

Status: proposed | accepted | replaced

### Context

Why this decision is needed.

### Decision

What was chosen.

### Alternatives considered

- Option A
- Option B

### Consequences

Positive and negative effects.

### Docs/code affected

- File/path
```

## Current decisions

## 2026-05-04 — NextAuth v4 for credentials auth

Status: accepted

### Context

The production wiring phase needed user authentication. Next.js App Router has limited support for NextAuth v5 (beta) at the time of implementation.

### Decision

Use `next-auth@^4` with the credentials provider (email + password). Session strategy is JWT with `userId` and `workspaceId` stored in the token. Workspace is resolved at sign-in time and embedded in the session, avoiding per-request workspace lookups.

### Alternatives considered

- **NextAuth v5 (beta):** breaking API changes and App Router quirks made it higher-risk for this MVP.
- **Custom JWT middleware:** more control but more code; NextAuth covers the login flow, CSRF, and session management.
- **OAuth providers (Google, GitHub):** viable but adds setup overhead outside MVP scope.

### Consequences

- Session shape: `{ user: { id, email, name, workspaceId } }`.
- Module augmentation (`declare module "next-auth"`) required to extend the default session and JWT types.
- `requireSession()` helper in `src/lib/session.ts` used by all API routes.
- Migrate to NextAuth v5 once it stabilizes.

### Docs/code affected

- `src/lib/auth.ts`, `src/lib/session.ts`
- `src/app/api/auth/[...nextauth]/route.ts`
- `src/app/login/page.tsx`, `src/app/signup/page.tsx`

---

## 2026-05-04 — OpenRouter via `openai` npm SDK

Status: accepted

### Context

The production wiring phase needed a real hosted LLM. OpenRouter provides access to many models (Claude, GPT-4, Gemini) behind a single OpenAI-compatible API.

### Decision

Use the `openai` npm SDK with `baseURL: "https://openrouter.ai/api/v1"` to call OpenRouter. This keeps the SDK surface familiar and avoids a custom HTTP client. The `OpenRouterLlmAdapter` class in `src/server/assistant/llm.ts` implements the existing `LlmAdapter` interface and is selected when `LLM_PROVIDER=openrouter`.

### Alternatives considered

- **Anthropic SDK directly:** ties implementation to one provider.
- **Custom fetch:** more control, but re-invents SDK error handling and streaming.
- **Vercel AI SDK:** broader abstraction, but adds another dependency layer and obscures tool-call handling.

### Consequences

- `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` env vars required in production.
- Falls back to local deterministic adapter if `LLM_PROVIDER` is unset or `local`.
- Tool calls are mapped: `LlmToolDefinition[]` → OpenAI function format → `LlmToolCall[]`.

### Docs/code affected

- `src/server/assistant/llm.ts`
- `.env.example`

---

## 2026-05-04 — Next.js 16 proxy for route protection

Status: accepted

### Context

`src/middleware.ts` is deprecated in Next.js 16. Route protection needed updating.

### Decision

Use `src/proxy.ts` as a lightweight cookie-presence check. The proxy only checks whether the `next-auth.session-token` (or `__Secure-next-auth.session-token`) cookie exists and redirects to `/login` if absent. Full session validation happens server-side in `requireSession()` per API route and `getServerSession()` in server components.

### Alternatives considered

- **Validate session in proxy:** would require calling the DB on every request in the proxy, which is expensive and complex.
- **Middleware v2 (Next.js 16 native):** the proxy pattern is the idiomatic Next.js 16 approach.

### Consequences

- Cookie presence is a necessary but not sufficient auth check — the real validation is always server-side.
- Secure cookie name (`__Secure-`) is checked in HTTPS environments; plain cookie name is checked in local dev.

### Docs/code affected

- `src/proxy.ts` (replaces deleted `src/middleware.ts`)

---

## 2026-05-03 - Initial MVP application stack

Status: accepted

### Context

Phase 0 needs a practical stack before creating the app skeleton. The product needs a mobile-first web UI, server-side routes for app APIs and Telegram webhooks, structured persistence for boards and canvas items, provider-agnostic assistant integration, and a sandboxed runtime for generated HTML widgets.

### Decision

Use the following initial stack for the MVP:

- **Language:** TypeScript across the app.
- **Web framework:** Next.js with React and server routes.
- **Styling:** Tailwind CSS with project-level design tokens as needed.
- **Database:** Postgres.
- **ORM/schema layer:** Prisma unless the implementation task finds a strong blocker.
- **Testing:** Vitest for unit tests and Playwright for browser/mobile QA once UI exists.
- **Assistant runtime:** Provider-agnostic LLM adapter behind an internal interface.
- **Telegram integration:** Server route webhook adapter using the same domain services and audit model as the web app.
- **Widget runtime:** Sandboxed iframe renderer with explicit permissions and no default network/tool access.

Exact package versions will be chosen during the app skeleton task using current official package guidance.

### Alternatives considered

- **Vite React SPA plus separate API server:** simpler frontend build, but creates extra deployment and API boundary work before the MVP needs it.
- **SvelteKit:** strong app framework, but React has broader canvas, whiteboard, and agent UI ecosystem support for this project.
- **SQLite-first persistence:** easy for local development, but Postgres better matches the durable structured board, audit, task, and integration data model.
- **Drizzle ORM:** viable TypeScript-first option, but Prisma is a conservative default for rapid schema iteration and common agent familiarity.

### Consequences

- Next.js keeps web UI, API routes, webhook routes, and server-side app logic in one deployable app during MVP.
- Postgres supports durable structured canvas state, audit events, tasks, reminders, chat threads, and future relational queries.
- Tailwind speeds mobile-first layout work without introducing a separate component framework.
- Prisma adds generated client and migration workflow overhead, but gives a clear schema center for early data modeling.
- The provider-agnostic assistant interface avoids coupling canvas tools to one LLM provider.
- Widget sandboxing is a first-class architecture concern from the beginning.

### Docs/code affected

- `docs/architecture/TECH_DECISIONS.md`
- `TODO.md`
- `CURRENT_STATUS.md`
- `SESSION_HANDOFF.md`
