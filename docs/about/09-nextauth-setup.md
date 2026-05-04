# 09 — NextAuth Setup

**File:** `src/lib/auth.ts`

This file is the single source of truth for authentication configuration. Every server-side request that needs to know *who* is calling goes through the `authOptions` object exported from here.

## Why NextAuth v4 with Credentials?

We use a self-hosted auth model rather than OAuth because:

- The product is a personal productivity tool where email+password is simpler for users.
- Credentials avoid third-party dependency and keep signup/onboarding self-contained.
- JWT sessions mean no database session table — the token is self-contained, fast to verify, and works across serverless instances without a shared session store.

If OAuth providers (Google, GitHub) are added later, they layer on top of this config — the `callbacks` and `pages` remain the same.

## The configuration object

```typescript
export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [ /* ... */ ],
  callbacks: { /* ... */ },
};
```

### secret

`AUTH_SECRET` is the primary secret (NextAuth v5 convention). `NEXTAUTH_SECRET` is the fallback (NextAuth v4 convention). This dual check avoids breaking configs during migration. The secret is used to sign and verify the JWT — **it must be set in production** or every restart invalidates all sessions.

### session strategy

`strategy: "jwt"` means sessions are stored in a signed JWT inside a cookie on the client. There is no server-side session store. The JWT is verified by `getServerSession()` on every request using the secret.

The alternative `"database"` strategy would require a `Session` table in the database and hit the DB on every request. JWT is simpler and faster for our use case.

### pages

When NextAuth detects an unauthenticated request, it redirects to `/login`. The `callbackUrl` query parameter is automatically appended so the user returns to where they were after signing in.

This setting works in tandem with `src/proxy.ts` (see [12-route-protection.md](./12-route-protection.md)) — the proxy catches unauthenticated requests before they hit pages, and this config catches unauthenticated API calls to NextAuth-protected routes.

## Module augmentation

NextAuth's built-in TypeScript types are deliberately minimal. We extend them so every server-side function that accesses `session.user` knows exactly what fields are available.

```typescript
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      workspaceId: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    workspaceId: string;
  }
}
```

**Why two augmentations?**

The `Session` augmentation shapes what `getServerSession()` and `useSession()` return. The `JWT` augmentation shapes what the internal token looks like between the `jwt` and `session` callbacks.

Without these augmentations, TypeScript would complain that `session.user.workspaceId` doesn't exist.

**Why `workspaceId` in the session?**

Every data access in the app is scoped to a workspace. By resolving the workspace **once at sign-in** and embedding it in the JWT, we avoid a database lookup on every API request. This is a conscious trade-off:

- **Pro:** No per-request DB hit for workspace resolution. Latency is lower.
- **Con:** If a user's workspace changes between tokens expiring, they need to re-authenticate to get the new value. (In practice, workspaces are stable — one per user, auto-created.)

## Callbacks

### jwt callback

```typescript
jwt({ token, user }) {
  if (user) {
    token.userId = user.id;
    token.workspaceId = (
      user as unknown as { workspaceId: string }
    ).workspaceId;
  }
  return token;
},
```

This callback fires at two moments:

1. **On sign-in:** `user` is the object returned by `authorize()`. We copy `id` and `workspaceId` from the user object into the JWT token. This is the *only* time we have access to the raw user object — on subsequent requests, `user` is `undefined`.

2. **On token refresh (subsequent requests):** `user` is `undefined`, so we return the token as-is. The `userId` and `workspaceId` from step 1 are already embedded in the token and will survive re-verification.

The `as unknown as { workspaceId: string }` cast is necessary because NextAuth's `User` type doesn't include `workspaceId`. The augmentation on `JWT` covers the token side, but the `user` parameter still uses NextAuth's internal type.

### session callback

```typescript
session({ session, token }) {
  session.user = {
    id: token.userId,
    email: token.email ?? "",
    name: token.name,
    workspaceId: token.workspaceId,
  };
  return session;
},
```

This fires on every request. It maps the JWT token fields back onto `session.user` so downstream code (API routes, server components) can access them via `session.user.id`, `session.user.workspaceId`, etc.

The `token.email` field is set automatically by NextAuth from the credentials provider. We don't need to explicitly store it in the `jwt` callback — NextAuth does that for us.

## How it wires together

```
sign-in request
  → CredentialsProvider.authorize()
    → returns { id, email, name, workspaceId }
  → jwt callback (user is populated)
    → token.userId = user.id
    → token.workspaceId = user.workspaceId
  → NextAuth signs JWT, sets cookie

subsequent request
  → NextAuth verifies cookie → decodes token
  → jwt callback (user is undefined)
    → returns token unchanged
  → session callback
    → maps token → session.user
  → getServerSession() returns session
```

## Route handler

The actual NextAuth route handler is in `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

This exports a single handler for both GET and POST to the catch-all route `/api/auth/*`. NextAuth uses this route for sign-in, sign-out, session retrieval, CSRF tokens, and callbacks.

## Environment variables

| Variable | Purpose |
|---|---|
| `AUTH_SECRET` | JWT signing/verification key (preferred) |
| `NEXTAUTH_SECRET` | Fallback JWT key |

If neither is set, NextAuth uses an autogenerated secret that changes on every server restart — this invalidates all sessions. Always set `AUTH_SECRET` in `.env.local` for development and in production environment variables.

## What happens without auth

If a request hits an API route without a valid session cookie:

1. `requireSession()` (from `src/lib/session.ts`) calls `getServerSession(authOptions)`.
2. NextAuth reads the cookie, finds no valid JWT, and returns `null`.
3. `requireSession()` returns a `401 Unauthorized` JSON response.

On the client side, `useSession()` returns `{ status: "unauthenticated" }` and the UI shows the login page.

---

**Next:** [10-credentials-provider.md](./10-credentials-provider.md) — how the `authorize` function validates email/password and resolves the workspace.
