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
