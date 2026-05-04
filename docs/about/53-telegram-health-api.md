# 53 — Telegram Webhook, Health, and Workspace APIs

This chapter covers three lightweight endpoints that serve supporting roles: the Telegram webhook handler, the health check, and the workspace info endpoint.

## Files referenced

- `src/app/api/telegram/webhook/route.ts` — POST (Telegram bot webhook)
- `src/app/api/health/route.ts` — GET (public health check)
- `src/app/api/workspace/route.ts` — GET (workspace info)

## POST /api/telegram/webhook — Telegram bot webhook

> **Full implementation is detailed in chapter 44.** This section recaps the endpoint's role for completeness.

The Telegram webhook endpoint receives updates from Telegram when users interact with the bot. It is the entry point for Telegram-based commands: creating notes, tasks, reminders, boards, and summarizing content.

### Key differences from other API routes

1. **Authentication.** Does NOT use `requireSession()`. Authenticates via Telegram's secret token header (`X-Telegram-Bot-Api-Secret-Token`), validated against the `TELEGRAM_SECRET_TOKEN` environment variable.

2. **Response pattern.** Returns `{ success: true }` (plain JSON) after processing, not `{ error: "..." }`. Telegram requires 200 OK quickly; errors are communicated to the user via Telegram's `sendMessage` API.

3. **Session mapping.** Looks up the user by `telegramChatId` from the database and maps it to the internal `userId`/`workspaceId`.

4. **Tool execution.** Uses the same tool registry as the chat API, so Telegram commands go through the same permission and data model as web commands.

```typescript
// Conceptual flow:
POST /api/telegram/webhook
  → Validate secret token header
  → Parse Telegram update (message text, chat id)
  → Look up user by telegramChatId
  → Interpret command, build tool input
  → Execute tool via registry (same as chat)
  → Send response back to Telegram via HTTP
  → Return 200 OK
```

### Why Telegram has its own endpoint

Telegram operates on a webhook push model — Telegram sends updates to our server, we don't poll. The webhook URL must be publicly accessible. Authentication is token-based because there is no NextAuth session context. See chapter 44 for the full architecture.

## GET /api/health — Public health check

A simple, public health check endpoint used by deployment platforms (Docker health checks, Railway, Vercel, etc.) and monitoring systems.

### Implementation

```typescript
// src/app/api/health/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "visual-ai-whiteboard-agent",
  });
}
```

### Characteristics

- **No authentication required.** This is the only endpoint (along with the signup page) that does not call `requireSession()`. Health checks must succeed without credentials.
- **No database access.** The endpoint does not query the database. It simply verifies that the Next.js route handler is running and responding.
- **Returns service name.** The `service` field identifies the application for monitoring dashboards.
- **Always returns 200.** If the server is running, this endpoint returns 200. Any other status means the server is unhealthy.

**Why no database check.** A health check that queries the database would couple the health status to database availability. If the database is down but the web server is up, the load balancer would route requests to a server that can't serve real requests anyway. This endpoint checks "is the Next.js server alive" — deeper health (database, LLM provider) requires separate monitoring.

### Usage examples

Docker health check in a Dockerfile:

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1
```

Kubernetes liveness probe:

```yaml
livenessProbe:
  httpGet:
    path: /api/health
    port: 3000
  initialDelaySeconds: 15
  periodSeconds: 20
```

Platform health check (Railway, Vercel, etc.): typically configured to hit `/api/health` at a regular interval.

## GET /api/workspace — Workspace info

Returns information about the current user's workspace — the workspace ID, user ID, and board count.

### Implementation

```typescript
// src/app/api/workspace/route.ts
import { NextResponse } from "next/server";
import { listBoardsForWorkspace } from "@/db/boards";
import { requireSession } from "@/lib/session";

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  const boards = await listBoardsForWorkspace(session.workspaceId);

  return NextResponse.json({
    workspaceId: session.workspaceId,
    userId: session.userId,
    boardCount: boards.length,
  });
}
```

### Response shape

```json
{
  "workspaceId": "clx...abc",
  "userId": "cly...def",
  "boardCount": 7
}
```

### Purpose

This endpoint provides a lightweight way for the client to verify session state and get workspace metadata. Unlike `GET /api/boards` (which returns full board objects), this endpoint returns only the count, making it suitable for:

- Initial app load (verify session is valid, get workspace context)
- User settings/preferences page (display workspace stats)
- Integration tests (verify session + workspace after login)
- Admin/monitoring (count boards per workspace)

### Relationship to other endpoints

| Endpoint | Authentication | Returns |
|----------|---------------|---------|
| `GET /api/health` | None | `{ ok: true, service }` |
| `GET /api/workspace` | `requireSession()` | `{ workspaceId, userId, boardCount }` |
| `GET /api/boards` | `requireSession()` | `{ boards: Board[] }` |

The progression is: health (no auth) → workspace (auth only) → boards (auth + data). Each adds more information and more requirements.

## Why health and workspace are in the same API surface

These endpoints are intentionally lightweight. They follow the same `NextResponse.json()` pattern as all other API routes but serve infrastructure and session needs rather than business logic.

- **Health** is a requirement for any deployed application. Separating it from business logic keeps monitoring infrastructure decoupled from the application's internal state.
- **Workspace** is a convenience endpoint that avoids over-fetching. The client can verify "am I authenticated and what's my workspace?" in one lightweight call instead of requesting the full board list.

## Error handling

| Endpoint | Auth failure | Error shape |
|----------|-------------|-------------|
| `GET /api/health` | N/A (public) | Always succeeds if server is up |
| `GET /api/workspace` | 401 `{ error: "Unauthorized." }` | Standard `requireSession()` error |

The health endpoint should never return an error response — if it does, it means the Next.js request pipeline itself is broken, which is precisely what health checks are designed to detect.

## Monitoring considerations

When deploying, configure:

1. **Health check URL:** `GET /api/health` — interval 30s, timeout 5s
2. **Health check expected response:** HTTP 200 with `{ "ok": true }`
3. **Graceful shutdown:** The health endpoint should return healthy until the server begins graceful shutdown (Next.js handles this by default)

The `service` field in the health response can be matched in monitoring dashboards to distinguish this service from others running in the same infrastructure.
