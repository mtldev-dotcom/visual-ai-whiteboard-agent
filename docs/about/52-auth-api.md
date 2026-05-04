# 52 — Auth API (`/api/auth`)

The auth API handles authentication via NextAuth and user registration via a custom signup endpoint.

## Files referenced

- `src/app/api/auth/[...nextauth]/route.ts` — NextAuth catch-all route
- `src/app/api/auth/signup/route.ts` — POST signup handler
- `src/lib/auth.ts` — `authOptions` configuration for NextAuth
- `src/lib/session.ts` — `requireSession()` helper
- `src/lib/password.ts` — `hashPassword()` (bcrypt)
- `src/lib/signup.ts` — `isSignupEnabled()` gate function
- `src/db/workspaces.ts` — `getOrCreateWorkspaceForUser()`
- `src/server/onboarding.ts` — `seedOnboardingBoard()`

## NextAuth route: /api/auth/[...nextauth]

The NextAuth catch-all route handles all authentication flows — login, logout, session checks, and (if configured) OAuth provider callbacks.

### Implementation

```typescript
// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

This is the standard NextAuth setup. Only 7 lines because NextAuth handles most of the complexity internally.

### What [...nextauth] handles

- `GET /api/auth/session` — Returns the current session (used by `useSession()` in client components)
- `GET /api/auth/signin` — Sign-in page (if using NextAuth's built-in pages)
- `POST /api/auth/signin` — Credentials login
- `POST /api/auth/signout` — Sign out
- `GET /api/auth/csrf` — CSRF token
- `GET /api/auth/providers` — Available providers list
- `GET /api/auth/callback/<provider>` — OAuth provider callbacks

### authOptions

The `authOptions` object in `src/lib/auth.ts` configures:
- **Credentials provider** — email + password authentication
- **Session strategy** — JWT (not database sessions, for statelessness)
- **Callbacks** — `jwt` and `session` callbacks that inject `userId` and `workspaceId` into the session
- **Pages** — custom sign-in page at `/login`

The session callback is what makes `workspaceId` available in the session:

```typescript
// Pseudocode of what authOptions callbacks do:
session callback: (session, token) => {
  session.user.id = token.sub;
  session.user.workspaceId = token.workspaceId;
  return session;
}
jwt callback: (token, user) => {
  if (user) {
    token.workspaceId = user.workspaceId;
  }
  return token;
}
```

This is why `requireSession()` can destructure `session.workspaceId` — it was injected by the NextAuth session callback at login time.

## POST /api/auth/signup — User registration

The signup endpoint creates a new user account, provisions a workspace, and seeds an onboarding board. It is the second exception (after `/api/health`) to the `requireSession()` pattern — signup happens before authentication.

### Flow

1. Check `APP_SIGNUP` environment variable gate (403 if disabled)
2. Parse body: `{ email, password, name? }`
3. Validate email and password are present (400 if missing)
4. Normalize email to lowercase trimmed (400 if password < 8 chars)
5. Check for existing user by email (409 if exists)
6. Hash password with bcrypt (cost factor 12)
7. Create user in database
8. Create workspace for user via `getOrCreateWorkspaceForUser()`
9. Seed onboarding board via `seedOnboardingBoard(workspace.id)`
10. Return `{ ok: true }` with status 201
11. Catch block: return 500 for unexpected errors

### Implementation

```typescript
// src/app/api/auth/signup/route.ts
import { NextResponse } from "next/server";
import { getPrismaClient } from "@/db/client";
import { getOrCreateWorkspaceForUser } from "@/db/workspaces";
import { hashPassword } from "@/lib/password";
import { isSignupEnabled } from "@/lib/signup";
import { seedOnboardingBoard } from "@/server/onboarding";

export async function POST(request: Request) {
  try {
    if (!isSignupEnabled()) {
      return NextResponse.json(
        { error: "Signup is currently disabled." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, password, name } = body as {
      email?: string;
      password?: string;
      name?: string;
    };

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const prisma = getPrismaClient();
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name: name?.trim() || null,
      },
    });

    const workspace = await getOrCreateWorkspaceForUser(
      user.id,
      user.name ?? user.email
    );
    await seedOnboardingBoard(workspace.id);

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
```

### APP_SIGNUP gate

```typescript
if (!isSignupEnabled()) {
  return NextResponse.json(
    { error: "Signup is currently disabled." },
    { status: 403 }
  );
}
```

The `isSignupEnabled()` function checks an environment variable (typically `APP_SIGNUP=true` or `APP_SIGNUP=false`). When disabled, signup returns 403 regardless of the request content.

**Why a signup gate.** During private beta or when the deployment is meant for a single user, the signup gate prevents unauthorized account creation. It's a simple on/off switch controlled by environment configuration.

### Password handling

Passwords are hashed with bcrypt at cost factor 12:

```typescript
const passwordHash = await hashPassword(password);
```

**Why cost 12.** bcrypt cost factor 12 takes approximately 250-300ms on modern hardware. This is fast enough that users don't notice a delay, but slow enough that brute-force attacks are impractical. The `hashPassword` function is defined in `src/lib/password.ts`.

The plaintext password never touches the database. Only the `passwordHash` is stored.

### Email normalization

```typescript
const normalizedEmail = email.toLowerCase().trim();
```

Emails are lowercased and trimmed before storage and comparison. This prevents duplicate accounts with different casing (e.g., `User@Example.com` vs `user@example.com`).

### Workspace provisioning

```typescript
const workspace = await getOrCreateWorkspaceForUser(
  user.id,
  user.name ?? user.email
);
```

Every user gets exactly one workspace auto-provisioned on signup. The workspace is named after the user (by `name` or `email`). This is a deliberate design choice — the app is organized around workspaces, and a user without a workspace would have nowhere to create boards.

### Onboarding board seeding

```typescript
await seedOnboardingBoard(workspace.id);
```

After workspace creation, an onboarding board is seeded with introductory content. This gives new users something to see immediately on first login instead of an empty canvas.

The `seedOnboardingBoard` function in `src/server/onboarding.ts` creates a board with:
- Welcome sticky notes explaining the interface
- Example task lists showing how tasks work
- Instructions for using the AI assistant

### Error handling

The signup endpoint wraps everything in a try/catch block that returns a generic 500 error. This is intentional — detailed error messages for internal failures could leak implementation details. The only specific errors are for:
- Signup disabled (403)
- Missing email/password (400)
- Short password (400)
- Duplicate email (409)

### What signup does NOT do

- Does NOT sign the user in automatically — after signup, the client must redirect to `/login` and authenticate
- Does NOT send a verification email — email verification is not implemented
- Does NOT require a username — only email and password are required, name is optional
- Does NOT support OAuth signup — OAuth signup flows through NextAuth directly

## Auth session pattern

All protected routes use the same session pattern described in chapter 47. Here it is in the context of auth:

```
User logs in (NextAuth credentials flow)
  → JWT token created with userId + workspaceId
  → Session callback injects workspaceId into session
  → Client stores session via next-auth/react SessionProvider
  → Every API request: requireSession() reads session
  → handler receives { session: { userId, workspaceId, email } }
```

The `Provider` wrapping in the app layout ensures session is available everywhere:

```typescript
// src/app/providers.tsx
<SessionProvider>
  <ThemeProvider>{children}</ThemeProvider>
</SessionProvider>
```

## Comparison: signup vs protected routes

| Aspect | `/api/auth/signup` | Protected routes |
|--------|-------------------|-----------------|
| Authentication | None needed (pre-auth) | `requireSession()` |
| Input validation | Email, password checks | Per-resource checks |
| Workspace ownership | Creates workspace | Verifies ownership |
| Error pattern | `{ error: "..." }` | `{ error: "..." }` |
| Status codes | 201, 400, 403, 409, 500 | 200, 201, 400, 401, 404 |

Despite different auth requirements, the signup endpoint still follows the core conventions: `NextResponse.json()`, `{ error: "..." }` error shape, explicit field validation, and appropriate HTTP status codes.
