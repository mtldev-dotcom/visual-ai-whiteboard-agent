# 43: Telegram Account Linking

**Sources:** `src/server/telegram/account-linking.ts` (65 lines), `src/db/telegram.ts` (172 lines)

## Why Account Linking Exists

A Telegram user sending `/newboard Project X` to the bot has no inherent connection to any workspace. The bot doesn't know:
- Who this person is.
- Which workspace they belong to.
- Whether they're authorized to create boards.

Account linking creates this connection: a one-time handshake that associates a Telegram user ID with a workspace, enabling all subsequent commands to operate in the correct workspace context.

## The Linking Flow

```text
┌──────────────────────────────────────────────────────────────┐
│  Web App                                                     │
│                                                              │
│  User clicks "Link Telegram" in Settings                     │
│         │                                                    │
│         ▼                                                    │
│  createTelegramLinkTokenRecord()                             │
│  → Generates token: "K3f9xQ2mZ7vY1pL8nR4wA5bC_DeFgHiJ"     │
│  → Stores SHA-256 hash in DB (not the raw token)             │
│  → 15-min expiry                                             │
│  → Returns raw token to show to user                         │
│         │                                                    │
│         ▼                                                    │
│  Shows: "Send /start K3f9xQ2m..." to the Telegram bot"      │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  Telegram                                                    │
│                                                              │
│  User sends: /start K3f9xQ2mZ7vY1pL8nR4wA5bC_DeFgHiJ       │
│         │                                                    │
│         ▼                                                    │
│  Webhook route detects /start command                        │
│  → Extracts token argument                                   │
│  → Calls consumeTelegramLinkToken()                          │
│         │                                                    │
│         ▼                                                    │
│  consumeTelegramLinkToken():                                 │
│  → Hashes provided token (SHA-256)                           │
│  → Looks up hash in DB                                       │
│  → Checks: not consumed? not expired?                        │
│  → In one transaction:                                       │
│     a. Marks token consumed (consumedAt = now)               │
│     b. Upserts TelegramAccount row                           │
│  → Returns success                                            │
│         │                                                    │
│         ▼                                                    │
│  Bot replies: "Telegram is linked. Try /boards or /tasks."   │
└──────────────────────────────────────────────────────────────┘
```

## Token Generation

```typescript
export const TELEGRAM_LINK_TOKEN_BYTES = 24;
export const TELEGRAM_LINK_TOKEN_TTL_MINUTES = 15;

export function createTelegramLinkToken(
  now: Date = new Date(),
): TelegramLinkToken {
  const token = randomBytes(TELEGRAM_LINK_TOKEN_BYTES).toString("base64url");
  const expiresAt = new Date(
    now.getTime() + TELEGRAM_LINK_TOKEN_TTL_MINUTES * 60_000,
  );

  return {
    expiresAt,
    token,
    tokenHash: hashTelegramLinkToken(token),
  };
}
```

### Token Characteristics

- **24 random bytes** — `randomBytes(24)` generates a cryptographically random token. 24 bytes = 192 bits of entropy, well beyond what's brute-forceable.
- **base64url encoding** — `toString("base64url")` produces a URL-safe string (uses `-` and `_` instead of `+` and `/`, no padding `=`). This produces a 32-character string.
- **Format:** `/^[A-Za-z0-9_-]{32}$/` — exactly 32 characters from the base64url alphabet.

### 15-Minute Expiry

```typescript
TELEGRAM_LINK_TOKEN_TTL_MINUTES = 15
```

Short-lived tokens mitigate the risk of:
- Token leaks (screenshots, logs, network capture).
- Abandoned tokens (user clicks "Link" but never sends /start).
- Token brute-force (192-bit entropy makes this infeasible anyway, but expiry adds another layer).

After 15 minutes, `isTelegramLinkTokenExpired()` returns `true` and the token is rejected.

### Timing-Safe Comparison

```typescript
export function safelyCompareTelegramLinkTokens(
  providedToken: string,
  expectedHash: string,
): boolean {
  if (!isValidTelegramLinkTokenFormat(providedToken)) {
    return false;
  }

  const providedHash = Buffer.from(hashTelegramLinkToken(providedToken), "hex");
  const expected = Buffer.from(expectedHash, "hex");

  if (providedHash.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(providedHash, expected);
}
```

**Why `timingSafeEqual`?** A regular string comparison (`===`) short-circuits on the first differing byte, leaking information about how many bytes matched through timing. An attacker could measure response times to narrow down the hash byte-by-byte.

`crypto.timingSafeEqual` compares the full length every time, regardless of content — preventing timing attacks.

**Why the format check first?** If the input doesn't match `/^[A-Za-z0-9_-]{32}$/`, reject immediately without hashing. This prevents a denial-of-service attack where an attacker sends extremely long strings that waste CPU on hashing.

## Token Storage: Hash-Only

```prisma
model TelegramLinkToken {
  id          String    @id @default(cuid())
  ownerUserId String
  workspaceId String
  tokenHash   String    @unique
  expiresAt   DateTime
  consumedAt  DateTime?
  createdAt   DateTime  @default(now())
}
```

**The DB only stores `tokenHash`, never the raw token.** This is critical:

```typescript
// ❌ WRONG: Store raw token
await prisma.telegramLinkToken.create({
  data: { token: "K3f9xQ2mZ7vY1pL8nR4wA5bC_DeFgHiJ" }
});
// If DB is compromised, attacker has all active tokens.

// ✅ RIGHT: Store only SHA-256 hash
await prisma.telegramLinkToken.create({
  data: { tokenHash: "e3b0c44298fc1c14..." }
});
// If DB is compromised, attacker has hashes, not tokens.
```

The raw token exists:
1. In memory during `createTelegramLinkToken()`.
2. Displayed to the user in the web UI.
3. Sent by the user via Telegram `/start`.
4. In memory during `consumeTelegramLinkToken()`.

It is never persisted to disk, never logged, never stored in a database.

### SHA-256 Hashing

```typescript
export function hashTelegramLinkToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
```

SHA-256 produces a 64-character hex string. For lookup, the DB query uses:

```typescript
const tokenHash = hashTelegramLinkToken(input.token);
const linkToken = await prisma.telegramLinkToken.findUnique({
  where: { tokenHash },
});
```

Because `tokenHash` is `@unique`, this is a fast indexed lookup.

## Token Consumption

```typescript
export async function consumeTelegramLinkToken(
  input: ConsumeTelegramLinkTokenInput,
): Promise<ConsumeTelegramLinkTokenResult> {
  // 1. Reject invalid format (fails fast without DB query)
  if (!isValidTelegramLinkTokenFormat(input.token)) {
    return { error: "Invalid or expired Telegram link token.", ok: false };
  }

  // 2. Hash and look up
  const tokenHash = hashTelegramLinkToken(input.token);
  const linkToken = await prisma.telegramLinkToken.findUnique({
    where: { tokenHash },
  });

  // 3. Reject if not found, already consumed, or expired
  if (
    !linkToken ||
    linkToken.consumedAt ||
    isTelegramLinkTokenExpired(linkToken.expiresAt)
  ) {
    return { error: "Invalid or expired Telegram link token.", ok: false };
  }

  // 4. Atomic transaction: consume token + create/update account
  const result = await prisma.$transaction(async (tx) => {
    const consumedToken = await tx.telegramLinkToken.update({
      data: { consumedAt: now },
      where: { id: linkToken.id },
    });

    const account = await tx.telegramAccount.upsert({
      create: {
        firstName: input.sender.firstName,
        lastName: input.sender.lastName,
        ownerUserId: linkToken.ownerUserId,
        telegramUserId: input.sender.telegramUserId,
        username: input.sender.username,
        workspaceId: linkToken.workspaceId,
      },
      update: {
        firstName: input.sender.firstName,
        lastName: input.sender.lastName,
        linkedAt: now,
        telegramUserId: input.sender.telegramUserId,
        unlinkedAt: null,
        username: input.sender.username,
        workspaceId: linkToken.workspaceId,
      },
      where: { ownerUserId: linkToken.ownerUserId },
    });

    return { account, consumedToken };
  });

  return { account: result.account, linkToken: result.consumedToken, ok: true };
}
```

### Why a Transaction

The two operations — marking the token consumed and creating/updating the account — must be atomic. If the token is consumed but the account creation fails:
- The user loses their token.
- They can't retry (token is consumed).
- They have to generate a new token from the web app.

If the account is created but the token isn't consumed:
- The token remains valid.
- Another Telegram user could use it to overwrite the account (account hijacking).

A `prisma.$transaction` ensures both succeed or both roll back.

### Upsert, Not Create

```typescript
const account = await tx.telegramAccount.upsert({ ... });
```

`upsert` handles re-linking scenarios:
- User links Telegram → Account created.
- User unlinks Telegram (sets `unlinkedAt`).
- User links again with new token → Upsert updates existing row (clears `unlinkedAt`, updates profile).

Using `create` would fail on the second link (unique constraint on `ownerUserId`).

### OwnerUserId Uniqueness

```prisma
model TelegramAccount {
  ownerUserId    String    @unique
  telegramUserId String    @unique
  // ...
}
```

- `ownerUserId` is unique — one web app user = at most one Telegram account.
- `telegramUserId` is unique — one Telegram user = at most one web app account.

This prevents:
- A web app user linking multiple Telegram accounts (confusion about which account receives replies).
- A Telegram user linking to multiple web app accounts (which workspace does a command apply to?).

### P2002 Error Handling

```typescript
catch (error) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return {
      error: "Telegram account is already linked to another user.",
      ok: false,
    };
  }
  throw error;
}
```

If the `upsert` violates the `telegramUserId` unique constraint (another web app user already linked this Telegram account), Prisma throws a P2002 error. The catch block converts this into a user-friendly error message instead of an unhandled server error.

## Getting Active Accounts

```typescript
export async function getActiveTelegramAccount(
  telegramUserId: string,
): Promise<TelegramAccount | null> {
  const prisma = getPrismaClient();

  return prisma.telegramAccount.findFirst({
    where: {
      telegramUserId,
      unlinkedAt: null,
    },
  });
}
```

This is called before every command. It:
1. Looks up the Telegram user ID.
2. Filters for `unlinkedAt: null` (only active links).
3. Returns `null` if not found or unlinked.

**Why `findFirst` instead of `findUnique`?** `telegramUserId` is `@unique`, so `findUnique` would work identically. Using `findFirst` with a compound condition (`telegramUserId` + `unlinkedAt: null`) is a stylistic preference — it makes the active-only filter explicit in the query rather than relying on the unique constraint alone.

## Unlinking

```typescript
export async function unlinkTelegramAccount(
  ownerUserId: string,
): Promise<TelegramAccount | null> {
  const prisma = getPrismaClient();

  const account = await prisma.telegramAccount.findUnique({
    where: { ownerUserId },
  });

  if (!account || account.unlinkedAt) {
    return account;
  }

  return prisma.telegramAccount.update({
    data: { unlinkedAt: new Date() },
    where: { ownerUserId },
  });
}
```

Unlinking:
1. Sets `unlinkedAt` to the current timestamp.
2. Does NOT delete the row (preserves audit history).
3. Does NOT delete tokens (tokens are already consumed or expired).
4. Immediate effect: next command from that Telegram user ID is rejected.

After unlinking:
- User can re-link with a new token (upsert clears `unlinkedAt`).
- User's boards, tasks, and widgets are unaffected (data lives in the workspace, not the Telegram account).
- The bot stops responding to commands from that Telegram account.

### Why Soft-Delete, Not Hard-Delete

Keeping the `TelegramAccount` row with `unlinkedAt` preserves:
1. **Audit trail** — When did linking/unlinking happen?
2. **Profile history** — What username was used during the link period?
3. **Security forensics** — If suspicious activity occurred, when was the account linked?

## Security Properties

| Property | How It's Achieved |
|---|---|
| Token secrecy | Only SHA-256 hash stored in DB |
| Token freshness | 15-minute expiry |
| Single use | `consumedAt` marks token used |
| Timing attack resistance | `timingSafeEqual` comparison |
| Format validation | Regex check before hashing |
| Account uniqueness | `ownerUserId` and `telegramUserId` unique constraints |
| Atomic consumption | Transaction wraps consume + upsert |
| Re-link safety | Upsert (not create) handles re-linking |
| Unlink reversibility | Soft delete (`unlinkedAt`) preserves history |

## Summary

Account linking is a one-time, token-based handshake that connects a Telegram identity to a workspace. The implementation prioritizes:
1. **Security** — Tokens are cryptographic, hashed, expiring, single-use, and timing-safe.
2. **Simplicity** — The flow is: generate token in web → send /start in Telegram → linked.
3. **Atomicity** — Token consumption and account creation happen in one transaction.
4. **Auditability** — Linking, unlinking, and re-linking are all traceable via timestamps.
