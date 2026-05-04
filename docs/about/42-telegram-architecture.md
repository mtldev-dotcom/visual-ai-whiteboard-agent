# 42: Telegram Architecture

**Source:** Multiple files (`src/server/telegram/`, `src/app/api/telegram/`, `src/db/telegram.ts`, `scripts/register-telegram-webhook.ts`)

## Why Telegram Integration Exists

The whiteboard assistant is most useful when it's always accessible. A web app requires opening a browser, navigating to a URL, and loading the page. Telegram is already open on most users' phones, making it the ideal quick-capture surface.

Telegram is explicitly designed as **a control surface, not a separate product**. This means:
- It uses the same workspace, boards, tasks, and tools as the web app.
- It operates under the same permission, audit, and safety model.
- It doesn't have its own data model or state — everything routes through the shared backend.
- A user who never uses Telegram should have the complete experience in the web app alone.

## Architecture Overview

```text
┌─────────────────┐
│   User's Phone  │
│  Telegram App   │
└────────┬────────┘
         │ HTTPS (Telegram servers)
         ▼
┌─────────────────┐
│ Telegram Bot API│
│ (api.telegram.org)│
└────────┬────────┘
         │ POST /api/telegram/webhook
         ▼
┌─────────────────────────────────────────────┐
│              Next.js App (Vercel)            │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │ route.ts (POST handler)              │   │
│  │  ├─ Validate webhook secret          │   │
│  │  ├─ Parse Telegram update            │   │
│  │  └─ Route to command handler         │   │
│  └──────────────┬───────────────────────┘   │
│                 ▼                            │
│  ┌──────────────────────────────────────┐   │
│  │ commands.ts                          │   │
│  │  ├─ Account check (linked?)          │   │
│  │  ├─ Command dispatch                 │   │
│  │  └─ DB operations (boards, tasks)   │   │
│  └──────────────┬───────────────────────┘   │
│                 ▼                            │
│  ┌──────────────────────────────────────┐   │
│  │ account-linking.ts                   │   │
│  │  ├─ Token generation (SHA-256)       │   │
│  │  ├─ Token hashing                    │   │
│  │  └─ Timing-safe comparison          │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │ db/telegram.ts                       │   │
│  │  ├─ createTelegramLinkTokenRecord    │   │
│  │  ├─ consumeTelegramLinkToken         │   │
│  │  └─ getActiveTelegramAccount         │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

## Bot Setup via BotFather

Before any code runs, a Telegram bot must be registered:

1. Open Telegram and message [@BotFather](https://t.me/BotFather).
2. Send `/newbot` and follow the prompts.
3. BotFather returns a bot token (e.g., `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`).
4. Store this token as `TELEGRAM_BOT_TOKEN` in `.env.local`.

The bot token is the bot's identity. Anyone with this token can control the bot — send messages, read conversations, modify settings. It must never be committed to version control, logged, or exposed to client-side code.

## Communication Model: Webhook vs. Polling

This implementation uses **webhooks**, not polling.

### Webhook (Used Here)
```
Telegram server → POST /api/telegram/webhook → Our app
```
- Telegram pushes updates to our server when messages arrive.
- Near-instant delivery (no polling delay).
- Requires a publicly accessible HTTPS URL.
- Lower resource usage (no continuous polling loop).

### Polling (Not Used)
```
Our app → GET /getUpdates → Telegram server → response
```
- Our app repeatedly asks "any new messages?"
- Simpler to develop (works on localhost without ngrok).
- Higher latency (polling interval).
- Higher resource usage (continuous requests).

Webhooks and polling are **mutually exclusive**. If you call `setWebhook`, Telegram stops delivering updates to `getUpdates` polling. If you call `deleteWebhook`, polling resumes. You cannot use both simultaneously.

## Webhook Registration

Webhook registration is done via the script at `scripts/register-telegram-webhook.ts`:

```typescript
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

Run with: `npm run telegram:webhook`

**What `setWebhook` configures:**
- `url` — Where Telegram should POST updates (our `/api/telegram/webhook` route).
- `secret_token` — A secret value that Telegram sends in the `X-Telegram-Bot-Api-Secret-Token` header of every webhook request. Our route validates this.
- `allowed_updates: ["message"]` — Only receive `message` updates, not inline queries, callback queries, etc. This reduces traffic and processing overhead.

**When to register:**
- After first deployment (the URL must be publicly accessible).
- After changing `APP_URL` or `TELEGRAM_WEBHOOK_SECRET`.
- After moving from local development to production.

## Message Flow: Telegram → Command → Reply

```
1. User sends /boards in Telegram app
2. Telegram servers POST the update to our webhook
3. route.ts validates x-telegram-bot-api-secret-token header
4. route.ts parses the update JSON:
   {
     "message": {
       "chat": { "id": 123456789 },
       "from": { "id": 987654321, "username": "johndoe" },
       "text": "/boards"
     }
   }
5. route.ts calls getTelegramReplyText, which dispatches to
   handleTelegramTextCommand
6. handleTelegramTextCommand:
   a. Checks account is linked (getActiveTelegramAccount)
   b. Calls listBoardsForWorkspace
   c. Formats result with formatBoardsReply
   d. Returns { text: "Recent boards:\n1. Launch Plan\n2. Ideas" }
7. route.ts calls sendTelegramMessage to POST the reply back to
   https://api.telegram.org/bot<token>/sendMessage
8. Telegram delivers the reply to the user's chat
```

### The `sendMessage` API Call

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

- `chat_id` — The chat to reply to (from `update.message.chat.id`).
- `disable_web_page_preview` — Prevents link previews. Important because board names might look like URLs, and we don't want inline previews cluttering replies.
- Error handling is minimal — throws on failure but doesn't retry. Telegram itself retries webhook delivery on server errors.

## Account Linking Requirement

**Every mutation command requires a linked account.** Read commands (`/boards`, `/tasks`) also require linking for simplicity — they show workspace-specific data, so they need a workspace context.

```typescript
const account = await dependencies.getActiveTelegramAccount(
  input.telegramUserId,
);

if (!account) {
  return { text: "Link your account from the web app before using Telegram commands." };
}
```

Before linking:
- `/boards` → "Link your account from the web app..."
- `/newboard Test` → "Link your account from the web app..."
- Any command → same message

After linking:
- `/boards` → "Recent boards:\n1. Test\n2. Ideas"
- `/newboard New Project` → "Created board: New Project"

Account linking flow is detailed in chapter 43.

## Benefits of This Architecture

**Shared data model.** Telegram doesn't have its own "Telegram Board" concept. When `/newboard` creates a board, it appears in the web app immediately. When the web app creates a note, `/boards` shows it.

**Shared audit trail.** Every Telegram mutation records an `AuditEvent` with `actorType: "telegram"`. This means all user actions are traceable — whether from web or Telegram — in one audit log.

**Simple surface.** The Telegram integration has no UI components. It's pure server-side: a route handler, a command dispatcher, and some DB helpers. Adding a new command only touches 1-2 files.

**Mobile-native.** Telegram is already mobile-optimized. We don't need to build a mobile app — Telegram IS the mobile app for quick capture.

## Limitations and Future Directions

**No inline keyboards yet.** Commands are text-based only. Future: inline keyboards could offer "Create Task 🗓 / Cancel ✖️" buttons instead of requiring exact command syntax.

**No file upload handling.** The `allowed_updates: ["message"]` filter only processes text. Images, documents, and voice messages are ignored. Future: handle photo messages as board attachments.

**No push reminders from Telegram.** Reminders are created via Telegram but notification delivery happens through the web app's notification system. Future: send reminder messages directly to the Telegram chat.

**No multi-account per Telegram user.** One Telegram user ID = one workspace link. If a user has multiple workspaces, they can only link one. Future: `/switch` command to select active workspace.
