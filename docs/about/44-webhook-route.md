# 44: Telegram Webhook Route

**Source:** `src/app/api/telegram/webhook/route.ts` (132 lines)

## Why This File Exists

This is the single HTTP entry point for all Telegram bot interactions. Every message a user sends to the bot hits this route as a POST request from Telegram's servers. It's the bridge between Telegram's Bot API and our application logic.

It's intentionally thin: security checks → parse → route to handler → send reply. No business logic, no database access (beyond account linking), no state management.

## Route Location

```
src/app/api/telegram/webhook/route.ts
```

In Next.js App Router, this maps to `POST /api/telegram/webhook` and `GET /api/telegram/webhook`. Both are exported as named functions from the same file.

## POST Handler — The Main Handler

### Full Flow

```typescript
export async function POST(request: Request) {
  // Step 1: Validate webhook secret
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const receivedSecret = request.headers.get("x-telegram-bot-api-secret-token");

  if (expectedSecret && receivedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // Step 2: Ensure bot token is configured
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json(
      { error: "Telegram bot is not configured." },
      { status: 503 },
    );
  }

  // Step 3: Parse the update
  const update = (await request.json()) as TelegramUpdate;
  const message = update.message;
  const text = message?.text?.trim();
  const chatId = message?.chat?.id;
  const telegramUserId = message?.from?.id;

  // Step 4: Skip malformed messages silently
  if (
    !message ||
    !text ||
    chatId === undefined ||
    telegramUserId === undefined
  ) {
    return NextResponse.json({ ok: true });
  }

  // Step 5: Process and reply
  const replyText = await getTelegramReplyText({
    message,
    telegramUserId: String(telegramUserId),
    text,
  });
  await sendTelegramMessage({
    botToken,
    chatId: String(chatId),
    text: replyText,
  });

  return NextResponse.json({ ok: true });
}
```

### Step 1: Webhook Secret Validation

```typescript
const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
const receivedSecret = request.headers.get("x-telegram-bot-api-secret-token");

if (expectedSecret && receivedSecret !== expectedSecret) {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}
```

Telegram sends a custom header `X-Telegram-Bot-Api-Secret-Token` with every webhook request. This secret was configured during `setWebhook` registration:

```typescript
// During webhook registration:
body: JSON.stringify({
  secret_token: webhookSecret || undefined,
  url: webhookUrl,
})
```

**Why validate this?** Without secret validation, anyone who discovers the webhook URL could POST fake Telegram updates, impersonating users and executing commands.

**The conditional `if (expectedSecret && ...)`** — If `TELEGRAM_WEBHOOK_SECRET` is not configured, the check is skipped. This is for development convenience (one less env var to set during local testing) but should never happen in production.

**401 response** — Unauthorized. Telegram retries failed webhook deliveries, but not for 4xx errors (client errors). Returning 401 tells Telegram "this request is invalid, don't retry."

### Step 2: Bot Token Check

```typescript
const botToken = process.env.TELEGRAM_BOT_TOKEN;
if (!botToken) {
  return NextResponse.json(
    { error: "Telegram bot is not configured." },
    { status: 503 },
  );
}
```

The bot token is required to send replies via `sendTelegramMessage`. If it's missing, the bot can't function. 503 (Service Unavailable) tells Telegram "try again later" — when the env var is configured, the webhook will work.

**Why check at the top?** Fail fast. If the token is missing, every request will fail. Checking at the start avoids wasting CPU on parsing updates that can't be replied to.

### Step 3: Parsing the Update

```typescript
type TelegramUpdate = {
  message?: TelegramMessage;
};

type TelegramMessage = {
  chat?: { id?: number | string };
  from?: {
    first_name?: string;
    id?: number | string;
    last_name?: string;
    username?: string;
  };
  text?: string;
};

const update = (await request.json()) as TelegramUpdate;
```

The TypeScript types are deliberately minimal — only the fields we use. A real Telegram update has many more fields (`inline_query`, `callback_query`, `edited_message`, etc.), but since we only registered for `message` updates, only message fields are relevant.

**Why `as TelegramUpdate` (type assertion) instead of a validation library?** For MVP, the parsing is trust-based (it comes from Telegram's servers after secret validation). In production, a validation library like Zod would be safer:

```typescript
// Future improvement:
const telegramUpdateSchema = z.object({
  message: z.object({
    chat: z.object({ id: z.union([z.number(), z.string()]) }),
    from: z.object({ id: z.union([z.number(), z.string()]) }),
    text: z.string().optional(),
  }).optional(),
});
const update = telegramUpdateSchema.parse(await request.json());
```

### Step 4: Silently Skipping Malformed Messages

```typescript
if (
  !message ||
  !text ||
  chatId === undefined ||
  telegramUserId === undefined
) {
  return NextResponse.json({ ok: true });
}
```

Returns `{ ok: true }` without processing. This happens for:
- Messages without text (stickers, photos, voice messages).
- Edited messages (these arrive as separate update types, not `message`).
- Channel posts (no `from` field).
- Any update that doesn't match the `message` type structure.

**Why `200 OK` instead of an error?** Telegram considers any non-2xx response as a failure and will retry. Returning 200 with `{ ok: true }` tells Telegram "we handled this" even though we did nothing. This prevents infinite retry loops for unsupported update types.

### Step 5: Processing and Replying

```typescript
const replyText = await getTelegramReplyText({
  message,
  telegramUserId: String(telegramUserId),
  text,
});
await sendTelegramMessage({
  botToken,
  chatId: String(chatId),
  text: replyText,
});
```

Two sequential async calls:
1. `getTelegramReplyText` — determines what to reply.
2. `sendTelegramMessage` — sends the reply via the Bot API.

**Why separate?** Separation of concerns: command processing and message delivery are different responsibilities. The command handler (`handleTelegramTextCommand`) returns text; the route handler knows about HTTP and Telegram API calls.

#### getTelegramReplyText — Command Routing

```typescript
async function getTelegramReplyText(input: {
  message: TelegramMessage;
  telegramUserId: string;
  text: string;
}) {
  const command = parseTelegramCommand(input.text);

  if (command === "/start") {
    const token = parseCommandArgument(input.text);

    if (!token) {
      return "Open the web app to link your Telegram account.";
    }

    const result = await consumeTelegramLinkToken({
      sender: {
        firstName: input.message.from?.first_name,
        lastName: input.message.from?.last_name,
        telegramUserId: input.telegramUserId,
        username: input.message.from?.username,
      },
      token,
    });

    return result.ok
      ? "Telegram is linked. Try /boards or /tasks."
      : result.error;
  }

  const reply = await handleTelegramTextCommand({
    telegramUserId: input.telegramUserId,
    text: input.text,
  });

  return reply.text;
}
```

**Why `/start` is handled here instead of in `handleTelegramTextCommand`?** `/start` with a token is an account linking operation, not a regular command. It:
1. Needs the `message.from` profile info (first name, username) — not part of `TelegramCommandInput`.
2. Calls `consumeTelegramLinkToken` directly — different from the `recordAuditEvent` + `createBoard` pattern.
3. Returns the linking result before any account check (obviously — the account doesn't exist yet).

**Two `/start` paths:**
- **With token:** `consumeTelegramLinkToken` → link account → success/error message.
- **Without token:** Prompt to open the web app. This handles the case where a user discovers the bot directly and sends `/start` without a link token.

All other commands (`/boards`, `/tasks`, `/newboard`, `/addnote`) are delegated to `handleTelegramTextCommand` in `commands.ts`.

#### sendTelegramMessage — API Call

```typescript
async function sendTelegramMessage(input: {
  botToken: string;
  chatId: string;
  text: string;
}) {
  const response = await fetch(
    `https://api.telegram.org/bot${input.botToken}/sendMessage`,
    {
      body: JSON.stringify({
        chat_id: input.chatId,
        disable_web_page_preview: true,
        text: input.text,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
  );

  if (!response.ok) {
    throw new Error("Telegram sendMessage failed.");
  }
}
```

A straightforward HTTP POST to Telegram's Bot API. Notable points:
- **`disable_web_page_preview: true`** — Prevents Telegram from rendering inline previews of any URLs in the reply text. Without this, a board name like "Project.Dashboard" could be misinterpreted as a URL and show a link preview card.
- **Error handling** — Throws on non-2xx responses. This bubbles up to the POST handler, causing it to return a 5xx error to Telegram. Telegram will retry the webhook delivery.
- **No retry logic** — If `sendMessage` fails due to a transient network issue, the route returns 500 and Telegram retries. We don't need client-side retry.

## GET Handler — Health Check

```typescript
export async function GET() {
  return NextResponse.json({ ok: true });
}
```

A simple health check endpoint. Used for:
1. **Deployment verification** — After deploying, `curl /api/telegram/webhook` should return `{ ok: true }`.
2. **Uptime monitoring** — A monitoring service can periodically GET this endpoint to verify the bot is alive.
3. **Webhook setup debugging** — If the webhook URL is wrong, the GET returns 200, confirming the route exists (POST failures are then likely a secret mismatch or URL misconfiguration).

**Why no secret check on GET?** The GET endpoint is public information (whether the service is up). There's no sensitive data to protect. The secret check is only needed for POST (which triggers actions).

## Webhook Registration Script

The webhook URL is registered with Telegram using `scripts/register-telegram-webhook.ts`:

```typescript
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const appUrl = process.env.APP_URL;
const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

const webhookUrl = new URL("/api/telegram/webhook", appUrl).toString();

const response = await fetch(
  `https://api.telegram.org/bot${botToken}/setWebhook`,
  {
    body: JSON.stringify({
      allowed_updates: ["message"],
      secret_token: webhookSecret || undefined,
      url: webhookUrl,
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  },
);
```

Run via: `npm run telegram:webhook`

The script:
1. Loads `.env.local` then `.env` (local overrides default).
2. Validates `TELEGRAM_BOT_TOKEN` and `APP_URL` are set.
3. Constructs the webhook URL from `APP_URL` + `/api/telegram/webhook`.
4. Sends `setWebhook` with the URL, secret, and allowed update types.
5. Posts result to console or throws on failure.

**Why `allowed_updates: ["message"]`?** Filters out updates we don't handle (inline queries, callback queries, edited messages). Without this filter, Telegram would send every update type, and we'd silently drop them in the "malformed message" check. Explicit filtering is cleaner and reduces bandwidth.

## Environment Variables Used

| Variable | Where Used | Required | Example |
|---|---|---|---|
| `TELEGRAM_WEBHOOK_SECRET` | POST handler, registration script | No (but recommended) | `my-secret-webhook-token-123` |
| `TELEGRAM_BOT_TOKEN` | POST handler, `sendTelegramMessage`, registration script | Yes | `123456:ABC-DEF1234...` |
| `APP_URL` | Registration script | For registration | `https://myapp.vercel.app` |

## Error Responses and Their Meanings

| Status | Condition | Telegram Behavior |
|---|---|---|
| 401 | Invalid webhook secret | Telegram does NOT retry (client error) |
| 503 | Bot token not configured | Telegram retries (server error) |
| 200 | Normal response | Telegram marks update as delivered |
| 5xx | `sendTelegramMessage` threw | Telegram retries |

## Security Properties of This Route

1. **Webhook secret validation** — Only Telegram's servers (which know the secret) can trigger commands.
2. **No raw token logging** — The route doesn't log the `token` argument from `/start`.
3. **Minimal surface** — 132 lines total. Fewer lines = fewer bugs.
4. **Silent rejection** — Malformed messages return 200, not 400, preventing information leakage about route internals.
5. **No request body persistence** — The update JSON is processed and discarded. No raw webhook payloads are stored.
