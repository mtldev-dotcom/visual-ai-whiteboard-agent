# 10 — Credentials Provider

**Files:** `src/lib/auth.ts` (authorize function), `src/lib/password.ts` (hashing)

This chapter covers how user credentials are validated at sign-in time and how password hashes are created during sign-up.

## The authorize function

Inside the `CredentialsProvider` in `src/lib/auth.ts`, the `authorize` function is the gatekeeper for every login attempt:

```typescript
async authorize(credentials) {
  if (!credentials?.email || !credentials.password) return null;

  const prisma = getPrismaClient();
  const user = await prisma.user.findUnique({
    where: { email: credentials.email.toLowerCase().trim() },
  });

  if (!user) return null;

  const valid = await verifyPassword(
    credentials.password,
    user.passwordHash,
  );
  if (!valid) return null;

  const workspace = await getOrCreateWorkspaceForUser(
    user.id,
    user.name ?? user.email,
  );

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    workspaceId: workspace.id,
  };
},
```

### Step by step

**Step 1: Guard clause**

```typescript
if (!credentials?.email || !credentials.password) return null;
```

If either field is missing, we return `null` immediately. NextAuth interprets `null` as "authentication failed" and returns an error to the client. There's no point hitting the database if the credentials are structurally invalid.

**Step 2: Find user by normalized email**

```typescript
const user = await prisma.user.findUnique({
  where: { email: credentials.email.toLowerCase().trim() },
});
```

Emails are normalized with `.toLowerCase().trim()` before lookup. The `User.email` field has a `@unique` constraint in the Prisma schema, so `findUnique` is efficient (indexed lookup).

Why normalize? Users type `User@Example.com` or ` user@example.com ` (with trailing space) — both should match the stored `user@example.com`. The signup endpoint does the same normalization when creating a user, so the stored email is always lowercase and trimmed.

**Step 3: Verify password hash**

```typescript
const valid = await verifyPassword(
  credentials.password,
  user.passwordHash,
);
if (!valid) return null;
```

The actual comparison is delegated to `src/lib/password.ts` (see below). If the hash doesn't match, we return `null` — the same response as "user not found." This is intentional: returning different error messages for "no such user" vs "wrong password" would leak whether an email is registered.

**Step 4: Get or create workspace**

```typescript
const workspace = await getOrCreateWorkspaceForUser(
  user.id,
  user.name ?? user.email,
);
```

Every authenticated user must have a workspace. `getOrCreateWorkspaceForUser` in `src/db/workspaces.ts` does exactly what it says:

- Looks for the user's first (oldest) workspace.
- If none exists, creates one named `"{displayName}'s Workspace"` on the fly.
- This is the only place in the codebase that auto-creates a workspace. Normal path: workspace is created at signup time. Fallback path: if signup was interrupted or a user migrated from a different system, we create it here so they never get stuck without one.

**Step 5: Return user object**

```typescript
return {
  id: user.id,
  email: user.email,
  name: user.name,
  workspaceId: workspace.id,
};
```

This object flows into the `jwt` callback (see [09-nextauth-setup.md](./09-nextauth-setup.md)) where `userId` and `workspaceId` are persisted into the JWT token.

**Important:** We do NOT return `user.passwordHash`. The `authorize` return value goes through NextAuth's callbacks and should never contain sensitive data. The password hash never leaves this function.

## Password hashing (`src/lib/password.ts`)

```typescript
import bcrypt from "bcryptjs";

export function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, 12);
}

export function verifyPassword(
  plaintext: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}
```

### Why bcrypt?

bcrypt is a deliberately slow hashing algorithm designed for password storage. Each hash computation takes ~250-350ms at cost factor 12, which makes brute-force attacks impractical.

### Why cost factor 12?

The cost factor (often called "salt rounds") controls how many iterations bcrypt runs internally:

- **Cost 8:** ~30ms — too fast for password hashing, an attacker can test many guesses per second.
- **Cost 10:** ~80ms — acceptable minimum, industry standard.
- **Cost 12:** ~250-350ms — our choice. Slow enough to deter brute-force attacks, fast enough that a single login (one comparison) feels instant to the user.
- **Cost 14+:** ~1s+ per hash — noticeable login delay, overkill for this use case.

We use cost 12 because the project is a personal productivity tool (not a high-security financial system) and we want login to feel snappy while still being secure.

### Why `bcryptjs` (pure JS) instead of native `bcrypt`?

`bcryptjs` is a pure JavaScript implementation with zero native dependencies. This avoids compilation issues across different platforms (macOS, Linux, Windows), simplifies Docker builds, and works the same in development and production.

The performance difference (~15% slower than native `bcrypt`) is negligible for a single hash per login.

### Where hashes are created

Password hashes are created during signup. The signup flow (in `src/app/api/auth/signup/route.ts` and `src/lib/signup.ts`):

```
1. Validate email format
2. Normalize email (lowercase + trim)
3. Check email isn't already taken
4. hashPassword(plaintext) → passwordHash
5. Create User record with passwordHash
6. Create Workspace for user
7. Seed onboarding board (or mark for post-signup seeding)
8. Return success
```

The plaintext password is never stored. After `hashPassword()` returns, the plaintext is discarded.

### Why not argon2?

argon2 is a newer, more memory-hard algorithm that's arguably more secure. However:

- `bcryptjs` is battle-tested (used by millions of Node.js apps for over a decade).
- The memory-hardness advantage of argon2 matters mainly when an attacker has physical access to the hash database, which is mitigated by database access controls.
- `bcryptjs` has fewer native dependency issues and wider compatibility.

The project could swap to argon2 in the future by changing three lines in `password.ts` — no other code depends on the hashing algorithm.

## Security properties

| Property | Implementation |
|---|---|
| Hash algorithm | bcrypt, cost factor 12 |
| Email normalization | `.toLowerCase().trim()` at lookup and creation |
| Timing attack resistance | bcrypt.compare is constant-time |
| No user enumeration | Same `null` return for missing user and wrong password |
| No hash in session | `passwordHash` never returned from `authorize()` |
| Plaintext never persisted | Password discarded after `hashPassword()` |
| Pure JS dependency | `bcryptjs` — no native bindings |

## Error handling during sign-in

When `authorize()` returns `null`, NextAuth returns a generic `CredentialsSignin` error to the client. The login page in `src/app/login` catches this and shows "Invalid email or password." The specific reason (bad email vs bad password) is intentionally hidden from the client.

**Next:** [11-session-management.md](./11-session-management.md) — how the `requireSession()` helper works in every API route.
