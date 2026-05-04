# 06 — Database Client

The database client at `src/db/client.ts` (28 lines) is the single entry point for all PostgreSQL access. Every database helper module in `src/db/` imports and calls `getPrismaClient()`.

## Full Source

```typescript
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export function getPrismaClient(): PrismaClient {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required before using the database.");
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
  }

  return prisma;
}
```

## Why `@prisma/adapter-pg`

Prisma v7 introduced the adapter pattern for database drivers. `@prisma/adapter-pg` uses the native `pg` (`node-postgres`) library for connection pooling. This is significantly faster than the legacy Prisma query engine that used its own connection handling. The `pg` library has been battle-tested for over a decade and handles connection pooling, retries, and timeouts reliably.

The adapter is instantiated once on first call to `getPrismaClient()`:

```typescript
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });
```

The `connectionString` is read from `process.env.DATABASE_URL` at runtime — not at import time. This means the file can be imported before the environment is fully loaded (which happens in Next.js API routes and server components).

## The Singleton Pattern

The `globalForPrisma` singleton prevents connection pool exhaustion during development. Next.js hot module replacement (HMR) can reload modules repeatedly, and without this pattern, each reload would create a new PrismaClient with a new connection pool.

```typescript
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};
```

`globalThis` is the Node.js global object that persists across module reloads. By storing the PrismaClient here, subsequent imports of `client.ts` return the same instance.

In **production** (`NODE_ENV === "production"`), the client is **not** cached on `globalThis`. Each call to `getPrismaClient()` creates a fresh client with its own connection pool. This is fine because:

1. Production doesn't have HMR — each serverless function or request handler imports modules once
2. Prisma connection pools created via `@prisma/adapter-pg` are lightweight
3. Not caching avoids any risk of stale connections surviving across requests

This is the standard pattern recommended by Prisma and Next.js documentation.

## Error Handling

The client throws early if `DATABASE_URL` is not set:

```typescript
if (!connectionString) {
  throw new Error("DATABASE_URL is required before using the database.");
}
```

This means you'll see a clear error at the point of first DB access rather than a cryptic `ConnectionError` from deep within the `pg` library. This is the only error handling in the client module — all other errors (query failures, constraint violations) are propagated from the PrismaClient and handled in the calling code.

## Import Path

The generated client is imported from `@/generated/prisma/client`:

```typescript
import { PrismaClient } from "@/generated/prisma/client";
```

This maps to `src/generated/prisma/client/index.js` via the `@/* → ./src/*` path alias in `tsconfig.json`. The client is regenerated into this path by the Prisma generator configured in `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}
```

## Usage Pattern Across the Codebase

Every `src/db/` module follows the same pattern:

```typescript
import { getPrismaClient } from "./client";

export function someDbOperation(input: SomeInput) {
  const prisma = getPrismaClient();
  return prisma.someModel.someMethod({ data: input });
}
```

Key observations:
- `getPrismaClient()` is called inside the function body, not at module level. This is important because Next.js API routes are cold-started per request in some deployment modes — you want the client created on first actual use.
- Functions return `Promise<ModelType>` directly — the callers handle errors.
- No `.catch()` blocks in the helpers. Errors bubble up to API route handlers or assistant tool executors.
- No `await` on `getPrismaClient()` — it's synchronous.

## Connection Pooling

The `pg` library (via `@prisma/adapter-pg`) manages connection pooling automatically. The pool configuration uses PostgreSQL defaults unless overridden via `DATABASE_URL` query parameters. For the development Docker setup, the pool default of 10 connections is more than sufficient.
