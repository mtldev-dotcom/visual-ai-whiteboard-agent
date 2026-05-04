# 12 — Route Protection

**File:** `src/proxy.ts`

This file implements a lightweight cookie-presence check that catches unauthenticated users *before* they reach protected pages. It's a first-line defense that sits in front of the app router.

## Why a proxy instead of middleware?

Next.js `middleware.ts` was deprecated in Next.js 16 in favor of `proxy.ts`. The pattern is nearly identical — the file exports a default function that receives `NextRequest` and returns `NextResponse` — but the naming and some internals changed.

```
Request flow:
  Browser → proxy.ts → App Router (pages/API) → requireSession()
              │                                        │
              └── checks cookie presence               └── checks actual session validity
```

The proxy does **not** verify session validity. It only checks whether a session cookie *exists*. Full validation happens at the API/route level via `requireSession()` or `getServerSession()`.

This split is intentional:
- The proxy runs on **every** non-public request and must be fast (no JWT verification, no database).
- API routes do the real authorization with full JWT verification.

## The proxy implementation

```typescript
import { type NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/signup", "/api/auth", "/api/health"];

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic =
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon");

  if (isPublic) {
    return NextResponse.next();
  }

  const sessionCookie =
    request.cookies.get("next-auth.session-token") ??
    request.cookies.get("__Secure-next-auth.session-token");

  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

## Public paths

```typescript
const PUBLIC_PATHS = ["/login", "/signup", "/api/auth", "/api/health"];
```

These four path prefixes are accessible without any cookie:

| Path | Why public |
|---|---|
| `/login` | Users need to reach the login page to authenticate |
| `/signup` | New users need to create accounts |
| `/api/auth` | NextAuth's own endpoints (sign-in, sign-out, CSRF, session fetch) |
| `/api/health` | Monitoring/uptime checks that shouldn't require auth |

Additionally, `/_next` (Next.js static assets and build output) and `/favicon` (favicon requests) are always allowed. Without these, the app's CSS, JS, and images would be blocked on the login page.

### startsWith matching

`pathname.startsWith("/api/auth")` matches:
- `/api/auth/signin`
- `/api/auth/callback/credentials`
- `/api/auth/session`
- `/api/auth/signout`
- `/api/auth/csrf`
- `/api/auth/providers`

All of these are NextAuth's internal endpoints. Blocking any of them would break authentication entirely.

## Cookie check

```typescript
const sessionCookie =
  request.cookies.get("next-auth.session-token") ??
  request.cookies.get("__Secure-next-auth.session-token");
```

NextAuth uses two cookie names depending on the environment:

- **`next-auth.session-token`**: HTTP (localhost development, non-HTTPS deployments).
- **`__Secure-next-auth.session-token`**: HTTPS with the `__Secure-` prefix (required by browsers for `Secure` cookies).

We check both because the app might run in either mode. The `??` operator tries the plain name first, then falls back to the prefixed name.

**Important:** We only check that the cookie *exists*, not that it's valid. An expired or tampered JWT still passes this check. That's by design — the actual API routes will reject invalid tokens with a 401. The proxy's job is to avoid rendering protected pages for users who definitely have no session at all.

## Redirect with callbackUrl

```typescript
if (!sessionCookie) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("callbackUrl", pathname);
  return NextResponse.redirect(loginUrl);
}
```

When the user has no session cookie and tries to access a protected page (e.g., `/boards/abc123`), they're redirected to:

```
/login?callbackUrl=%2Fboards%2Fabc123
```

The login page reads `callbackUrl` from the query string and, after successful sign-in, redirects the user back to where they were going. This is standard NextAuth behavior — the `callbackUrl` is automatically handled by the `signIn()` function.

This avoids the frustration of logging in and being dropped on the home page instead of the page you were trying to reach.

## Matcher exclusion

```typescript
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

The `matcher` config uses a negative lookahead regex to exclude paths that should never trigger the proxy:

- `_next/static`: Compiled JS/CSS bundles.
- `_next/image`: Next.js image optimization endpoint.
- `favicon.ico`: Browser favicon requests.

Without this exclusion, every asset request would hit the proxy function, adding unnecessary overhead to static file serving.

Note that this matcher is broader than the `PUBLIC_PATHS` check. `/login` still hits the proxy, but the `isPublic` check lets it through immediately.

## Double layer of protection

```
Layer 1 — proxy.ts:
  - Runs on page requests (not API calls if matcher is narrow enough).
  - Fast: just checks for a cookie string.
  - Purpose: don't render protected pages for unauthenticated users.
  - Failure mode: lets expired tokens through (false negative).

Layer 2 — requireSession():
  - Runs inside every API route handler.
  - Full: verifies JWT signature, decodes token, runs callbacks.
  - Purpose: enforce actual authorization for data access.
  - Failure mode: returns 401 for invalid/expired tokens.
```

Both layers are necessary:
- Without Layer 1, an unauthenticated user could still see page skeletons (though data fetches would fail).
- Without Layer 2, someone with a tampered cookie could potentially access data.

## What proxy.ts does NOT do

- **Does not verify JWT signatures.** That's `getServerSession()`'s job.
- **Does not check workspace membership.** The session's `workspaceId` is checked at the API level.
- **Does not handle CSRF.** NextAuth's built-in CSRF protection covers that.
- **Does not rate-limit.** Rate limiting (if needed in the future) would be a separate concern.
- **Does not log or audit.** The proxy is meant to be lightweight and stateless.

## Testing the proxy

Since the proxy is a pure function of `NextRequest`, it is trivially testable by constructing mock request objects:

```typescript
// Conceptual test
const req = new NextRequest("http://localhost:3000/boards");
req.cookies.set("next-auth.session-token", "valid-looking-token");
const res = await proxy(req);
assert(res.status === 200); // passed through
```

```typescript
// Conceptual test — no cookie
const req = new NextRequest("http://localhost:3000/boards");
const res = await proxy(req);
assert(res.status === 302); // redirected to /login
assert(res.headers.get("location").includes("callbackUrl="));
```

**Next:** [13-workspaces.md](./13-workspaces.md) — the workspace model and multi-tenant isolation pattern.
