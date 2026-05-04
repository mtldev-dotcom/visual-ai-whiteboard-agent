# 11 — Session Management

**File:** `src/lib/session.ts`

This tiny module (32 lines) is the bridge between NextAuth's generic session API and the application's specific needs. Every API route that requires authentication calls this module as its first two lines of logic.

## The `requireSession()` helper

```typescript
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

export type AppSession = {
  userId: string;
  workspaceId: string;
  email: string;
};

export async function requireSession(): Promise<
  { session: AppSession; error: null } | { session: null; error: NextResponse }
> {
  const raw = await getServerSession(authOptions);

  if (!raw?.user?.id || !raw.user.workspaceId) {
    return {
      error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
      session: null,
    };
  }

  return {
    error: null,
    session: {
      email: raw.user.email,
      userId: raw.user.id,
      workspaceId: raw.user.workspaceId,
    },
  };
}
```

### Why a discriminated union return type?

```typescript
{ session: AppSession; error: null } | { session: null; error: NextResponse }
```

The return type forces callers to check `error` before using `session`. If TypeScript sees that `error` is not `null`, it knows `session` is `null` and vice versa. This prevents accidentally using a session that doesn't exist:

```typescript
const { session, error } = await requireSession();
if (error) return error;
// TypeScript now knows session is AppSession, not null
console.log(session.userId); // safe
```

### The `AppSession` type

```typescript
export type AppSession = {
  userId: string;
  workspaceId: string;
  email: string;
};
```

This is deliberately minimal. Three fields that every API route needs:

- **`userId`**: Who is making the request — used for audit events, created-by markers, and ownership checks.
- **`workspaceId`**: Which workspace to scope data access to — used as a WHERE clause in every database query.
- **`email`**: Display purposes and as a fallback identity (useful in logs and error messages).

We don't include `name` because not all auth methods provide it, and API routes don't need it. We don't include NextAuth-internal fields like `expires` because API routes don't deal with token expiration.

### How it's used in API routes

Every protected API route follows the same two-line pattern:

```typescript
// src/app/api/boards/route.ts
export async function GET(request: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  // session.workspaceId is guaranteed to exist
  const boards = await listBoardsForWorkspace(session.workspaceId);
  return NextResponse.json({ boards });
}
```

This pattern appears in:

- `src/app/api/boards/route.ts` — list/create boards
- `src/app/api/boards/[id]/route.ts` — get/update/archive a board
- `src/app/api/canvas-items/route.ts` — list/create canvas items
- `src/app/api/canvas-items/[id]/route.ts` — get/update/delete a canvas item
- `src/app/api/tasks/route.ts` — list/create tasks
- `src/app/api/tasks/[id]/route.ts` — get/update a task
- `src/app/api/chat/route.ts` — AI chat endpoint
- `src/app/api/chat/thread/route.ts` — chat thread management
- `src/app/api/workspace/route.ts` — workspace info

That's every write-capable API route in the application.

## getServerSession vs useSession

This is a critical distinction that trips up many Next.js developers:

### `getServerSession(authOptions)` — Server-side only

```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const session = await getServerSession(authOptions);
```

- **Where:** Server Components, API routes, `getServerSideProps`.
- **How it works:** Reads the session cookie from the incoming HTTP request, verifies the JWT signature using `authOptions.secret`, decodes the token, runs the `jwt` and `session` callbacks, and returns the session.
- **Performance:** One JWT verification (no database call, since we use JWT strategy).
- **What it returns:** `Session | null` — the full session object with our augmented fields (`user.id`, `user.workspaceId`, etc.).

Every API route uses `getServerSession` via `requireSession()`.

### `useSession()` — Client-side only

```typescript
import { useSession } from "next-auth/react";

function MyComponent() {
  const { data: session, status } = useSession();
  // session?.user?.id, session?.user?.workspaceId, etc.
}
```

- **Where:** Client Components.
- **How it works:** Calls `/api/auth/session` (a NextAuth endpoint) to fetch the session. NextAuth auto-refreshes this periodically and when the tab regains focus.
- **Performance:** One HTTP request to `/api/auth/session` on mount. Results are cached client-side.
- **What it returns:** `{ data: Session | undefined, status: "loading" | "authenticated" | "unauthenticated" }`.

**Don't use `useSession()` for authorization.** A client-side session check can be bypassed by modifying the client code. Real authorization always happens server-side via `requireSession()`.

### Why both exist

```
Client-side (useSession):
  - Show/hide UI based on auth state (nav bar, login button)
  - Display user info (email, avatar)
  - Redirect to /login if not authenticated

Server-side (getServerSession / requireSession):
  - Protect API routes from unauthorized access
  - Scope database queries to the current workspace
  - Record audit events with the correct actor
```

## The SessionProvider wrapper

The `useSession()` hook requires a `SessionProvider` context. This is typically placed in a root layout or providers wrapper:

```typescript
// src/app/providers.tsx or similar
"use client";
import { SessionProvider } from "next-auth/react";

export function Providers({ children, session }) {
  return <SessionProvider session={session}>{children}</SessionProvider>;
}
```

The initial `session` prop is passed from a server component to avoid a client-side fetch on first render (the session is already in the server-rendered HTML).

## Token lifecycle

```
1. Sign in → JWT created with { userId, workspaceId, email, ... }
2. JWT signed with AUTH_SECRET, stored in cookie
3. Every request → cookie sent to server
4. Server → getServerSession() verifies JWT
5. JWT expires after 30 days (next-auth default)
6. No explicit refresh needed — the JWT is re-verified on each request
```

There's no "logout" callback in our code — NextAuth handles cookie deletion automatically when the user navigates to `/api/auth/signout`.

**Next:** [12-route-protection.md](./12-route-protection.md) — how the proxy middleware catches unauthenticated requests before they reach pages.
