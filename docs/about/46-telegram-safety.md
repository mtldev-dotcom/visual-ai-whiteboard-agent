# 46: Telegram Safety

**Sources:** `src/server/telegram/account-linking.ts`, `src/server/telegram/commands.ts`, `src/app/api/telegram/webhook/route.ts`, `src/db/telegram.ts`

## Why Safety Is Documented Separately

Telegram integration touches every security boundary in the application:
- Authentication (account linking via cryptographic tokens).
- Authorization (command gating via linked accounts).
- Data integrity (audit trail for all mutations).
- Input validation (all Telegram input is untrusted).
- Secret management (bot token, webhook secret, link tokens).

This document consolidates all safety properties across the Telegram subsystem so they can be reviewed, audited, and tested as a single security surface.

## Security Property 1: Account-Link Tokens Are Credentials

Link tokens are the most sensitive temporary secrets in the system. They bridge a Telegram identity to a workspace. If an attacker obtains a link token, they can link their Telegram account to the victim's workspace and issue commands as that workspace.

### Storage: Hash-Only

```
Raw token (in memory):  "K3f9xQ2mZ7vY1pL8nR4wA5bC_DeFgHiJ"
SHA-256 hash (in DB):   "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2"
```

The raw token is:
- **Never written to disk** — Only the hash is persisted.
- **Never logged** — No `console.log`, no error message, no audit event includes it.
- **Never stored in session** — It exists only during the `/start` command handler's execution.
- **Never included in URLs** — Telegram sends `/start <token>` as a chat message, not as a URL parameter.
- **Never exposed in API responses** — The webhook route doesn't echo the token.

If the database is compromised, the attacker has SHA-256 hashes. Reversing SHA-256 to recover 24 random bytes is computationally infeasible.

### Expiry: 15 Minutes

```typescript
export const TELEGRAM_LINK_TOKEN_TTL_MINUTES = 15;
```

A token lives for at most 15 minutes. After that, `isTelegramLinkTokenExpired()` returns `true` and the token is rejected. This mitigates:
- **Screenshot leaks** — A user takes a screenshot of the token and forgets about it. After 15 minutes, the screenshot is worthless.
- **Browser tab left open** — The token display page is closed or refreshed.
- **Async attacks** — An attacker can't harvest tokens over time and use them later.

### Single Use

```typescript
if (linkToken.consumedAt) {
  return { error: "Invalid or expired Telegram link token.", ok: false };
}
```

Once consumed, a token cannot be reused. The `consumedAt` timestamp is set in the same transaction that creates the account. This prevents:
- **Replay attacks** — Intercepting a `/start` message and re-sending it.
- **Token sharing** — Copying the token to a friend's Telegram.

### Timing-Safe Comparison

```typescript
export function safelyCompareTelegramLinkTokens(
  providedToken: string,
  expectedHash: string,
): boolean {
  const providedHash = Buffer.from(hashTelegramLinkToken(providedToken), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return timingSafeEqual(providedHash, expected);
}
```

Without `timingSafeEqual`, a regular string comparison would leak information about the hash through response timing. An attacker could:
1. Send `/start AAAA...` and measure response time (fast = no match).
2. Send `/start BAAA...` and measure response time (slightly slower = first byte matches).
3. Iterate through the hash space byte-by-byte, extracting the hash in ~256 * 64 = 16,384 attempts instead of the full 2^192 search space.

`timingSafeEqual` performs a constant-time comparison, making this attack infeasible.

### Format Validation Before Hashing

```typescript
export function isValidTelegramLinkTokenFormat(token: string): boolean {
  return /^[A-Za-z0-9_-]{32}$/.test(token);
}
```

The regex check runs BEFORE hashing. If an attacker sends a 1MB string as a token, the format check rejects it immediately without wasting CPU on hashing 1MB of data. This prevents a denial-of-service attack where an attacker spams `/start` with massive payloads.

### Atomic Consumption

```typescript
const result = await prisma.$transaction(async (tx) => {
  const consumedToken = await tx.telegramLinkToken.update({
    data: { consumedAt: now },
    where: { id: linkToken.id },
  });
  const account = await tx.telegramAccount.upsert({ ... });
  return { account, consumedToken };
});
```

Token consumption and account creation are atomic. If the database crashes mid-operation, either both succeed or both roll back. No partial state where:
- Token is consumed but account isn't created → User loses token, can't link.
- Account is created but token isn't consumed → Token can be reused to hijack the account.

## Security Property 2: All Telegram Input Is Untrusted

Every byte of Telegram input is treated as external, untrusted data. The webhook route is the single entry point, and no Telegram data bypasses validation.

### Input Parsing, Not Input Trust

```typescript
const update = (await request.json()) as TelegramUpdate;
const message = update.message;
const text = message?.text?.trim();
const chatId = message?.chat?.id;
const telegramUserId = message?.from?.id;
```

The optional chaining (`?.`) ensures that missing fields don't crash the server. The parsing is defensive: if any required field is missing, the update is silently dropped.

### No SQL Injection Risk

All database queries use Prisma's parameterized queries:

```typescript
// Safe: Prisma uses parameterized queries internally
await prisma.telegramAccount.findFirst({
  where: {
    telegramUserId,  // Passed as parameter, not string interpolation
    unlinkedAt: null,
  },
});
```

No string concatenation, no raw SQL, no query building. Prisma's query builder generates parameterized SQL.

### No XSS Risk in Replies

Replies are plain text sent to Telegram's API. Telegram renders them in its own UI, not in a browser with our DOM. User input in replies (board titles, task names) is displayed as plain text in Telegram's chat UI. No HTML injection is possible because Telegram doesn't render HTML in chat messages (unless `parse_mode: "HTML"` is set, which we don't use).

### No Command Injection

The command dispatch uses string equality checks, not eval:

```typescript
if (command === "/boards") { /* ... */ }
if (command === "/newboard") { /* ... */ }
```

Even if a user sends `/rm -rf /`, it's treated as an unknown command and produces a help message. No shell, no eval, no dynamic execution.

## Security Property 3: Linked-Account Enforcement

Every command handler starts with the account check:

```typescript
const account = await dependencies.getActiveTelegramAccount(
  input.telegramUserId,
);

if (!account) {
  return { text: UNLINKED_REPLY };
}
```

This is the single authorization gate. If `getActiveTelegramAccount` returns null:
- `telegramUserId` doesn't exist in `TelegramAccount` → User hasn't linked.
- `unlinkedAt` is not null → User de-linked.
- Return "Link your account..." message.

### Workspace Scoping

Once linked, all operations use `account.workspaceId`:

```typescript
const boards = await dependencies.listBoardsForWorkspace(account.workspaceId);
const board = await dependencies.createBoard({
  workspaceId: account.workspaceId,  // Never from user input
  ...
});
```

The `workspaceId` comes from the database record, NEVER from user input. A user cannot specify which workspace to operate on — it's determined by their account link.

### Account Uniqueness Constraints

```prisma
model TelegramAccount {
  ownerUserId    String    @unique
  telegramUserId String    @unique
}
```

- One web user → one Telegram account.
- One Telegram user → one web account.
- No multi-account ambiguity.

The `P2002` error handler catches uniqueness violations:

```typescript
if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
  return { error: "Telegram account is already linked to another user.", ok: false };
}
```

## Security Property 4: Webhook Secret Validation

```typescript
const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
const receivedSecret = request.headers.get("x-telegram-bot-api-secret-token");

if (expectedSecret && receivedSecret !== expectedSecret) {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}
```

The webhook secret is a shared secret between our server and Telegram's servers, configured during `setWebhook`:

```typescript
// During registration:
body: JSON.stringify({
  secret_token: webhookSecret,
  url: webhookUrl,
})
```

Without this check, anyone who discovers the webhook URL could POST fake updates, impersonating any Telegram user. The secret ensures:
- Only requests from Telegram's servers (which know the secret) are processed.
- Attacks like SSRF (if our server makes requests to itself) are blocked.
- Man-in-the-middle attacks on the webhook delivery are ineffective.

**Secret length matters:** The secret should be at least 32 random characters. Short secrets are brute-forceable if an attacker measures response timing across many requests.

## Security Property 5: Token Hashing Is SHA-256

```typescript
export function hashTelegramLinkToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
```

SHA-256 is chosen because:
1. **One-way** — Cannot recover the token from the hash.
2. **Cryptographically strong** — No known practical preimage attacks.
3. **Fast** — Hashing a 32-character token takes microseconds, not milliseconds.
4. **Standard** — Well-understood, widely implemented, no custom crypto.

**Why not bcrypt/scrypt/argon2?** Password hashing algorithms are designed to be slow (to resist brute-force on weak passwords). Link tokens are 24 random bytes (192 bits of entropy) — they don't need slow hashing. SHA-256 is fast and sufficient for high-entropy secrets.

## Security Property 6: Response Capping for Mobile Readability

```typescript
const visibleBoards = boards.slice(0, 10);
const remaining = boards.length - visibleBoards.length;
if (remaining > 0) {
  lines.push(`...and ${remaining} more.`);
}
```

Lists are capped at 10 items. Beyond mobile readability, this prevents:
- **Information leakage** — An attacker who compromises a Telegram account can't dump all workspace data at once.
- **Denial of service** — A workspace with 10,000 tasks can't produce a reply that chokes the server or the user's device.
- **Rate limiting** — Telegram itself has message size limits (4096 characters), and exceeding them silently truncates the message.

## Security Property 7: Audit Trail for Mutations

Every mutation creates an audit record:

```typescript
await dependencies.recordAuditEvent({
  action: "board.created",
  actorId: input.telegramUserId,
  actorType: "telegram",
  metadata: { command },
  summary: `Telegram created board: ${board.title}`,
  targetId: board.id,
  targetType: "Board",
  workspaceId: account.workspaceId,
});
```

### What the Audit Trail Answers

| Question | How the Audit Answers It |
|---|---|
| Who created this board? | `actorType: "telegram"`, `actorId` = Telegram user ID |
| When was it created? | `createdAt` on the `AuditEvent` row |
| What command was used? | `metadata: { command: "/newboard" }` |
| What was the result? | `targetId` = board ID, `summary` = human-readable description |
| Which workspace? | `workspaceId` |

### Audit Trail Security Properties

- **Immutable** — Audit events are created, never updated or deleted.
- **Linked** — Every event references its workspace, actor, and target.
- **Searchable** — Indexed by workspace, actor type, action, and target.
- **Tamper-evident** — Any gap or inconsistency in the audit trail is detectable.

## Security Property 8: No Public Unauthenticated Token-Issuing Routes

Link tokens are issued only from the web app, behind user authentication:

```typescript
// In src/db/telegram.ts:
export async function createTelegramLinkTokenRecord(
  input: CreateTelegramLinkTokenInput,  // Requires ownerUserId + workspaceId
): Promise<IssuedTelegramLinkToken> {
  // ...
}
```

There is no API endpoint like `POST /api/telegram/generate-link-token` that accepts arbitrary parameters. Tokens are generated server-side, in the context of an authenticated user session, with the user's identity and workspace already known.

A user cannot:
- Generate a token for someone else's workspace.
- Generate a token without being logged in.
- Generate an unlimited number of tokens (rate limiting per-user should be added).

## Security Checklist Summary

| # | Property | Implementation |
|---|---|---|
| 1 | Tokens are credentials, not stored plaintext | SHA-256 hashing only |
| 2 | Tokens expire quickly | 15-minute TTL |
| 3 | Tokens are single-use | `consumedAt` prevents reuse |
| 4 | Timing-safe comparison | `crypto.timingSafeEqual` |
| 5 | Format validation before hashing | Regex check prevents DoS |
| 6 | Atomic consumption | Transaction wraps consume + upsert |
| 7 | All input is untrusted | Defensive parsing, no eval |
| 8 | No SQL injection | Prisma parameterized queries |
| 9 | No XSS in replies | Plain text, Telegram renders UI |
| 10 | Account required for all commands | `getActiveTelegramAccount` gate |
| 11 | Workspace from DB, not user input | `account.workspaceId` |
| 12 | Account uniqueness | DB unique constraints + P2002 handling |
| 13 | Webhook secret validation | `x-telegram-bot-api-secret-token` header |
| 14 | Token hashing is SHA-256 | Standard one-way hash |
| 15 | Response capping | Max 10 items per list |
| 16 | Audit trail for mutations | `AuditEvent` per mutation |
| 17 | No public token-issuing routes | Tokens from authenticated sessions only |

## What's NOT Implemented (Yet)

These are security gaps that should be addressed before production:

1. **Rate limiting** — No per-user rate limit on commands. An attacker with a linked account could spam `/newboard` thousands of times.
2. **Command allowlisting by workspace settings** — All linked accounts have full command access. No per-workspace option to disable Telegram entirely or limit to read-only.
3. **Two-factor confirmation for destructive operations** — Creating a board from Telegram doesn't require secondary confirmation (though boards are not destructive).
4. **Session timeout for linked accounts** — Once linked, a Telegram account stays linked indefinitely until explicitly unlinked. No automatic re-authentication.
5. **Webhook IP allowlisting** — The webhook route accepts requests from any IP with the correct secret. Telegram's IP ranges are published, but restricting by IP would add defense-in-depth.
6. **Secret rotation** — No automated rotation of `TELEGRAM_WEBHOOK_SECRET` or `TELEGRAM_BOT_TOKEN`.
