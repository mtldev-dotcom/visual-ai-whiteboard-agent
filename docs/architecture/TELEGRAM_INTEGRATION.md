# Telegram Integration

## Purpose

Telegram is a quick control and capture surface for the assistant.

It should not become a separate product. It should operate on the same workspace, tools, permissions, and audit model as the web app.

## MVP commands

- `/boards` — list recent boards. Implemented as a server command handler that requires a linked Telegram account and returns up to 10 active boards from the linked workspace.
- `/tasks` — list open tasks. Implemented as a server command handler that requires a linked Telegram account and returns up to 10 open tasks from the linked workspace.
- `/newboard` — create board. Implemented as a linked-account-only command that creates a board in the linked workspace and records an audit event.
- `/addnote` — add note to board. Implemented as `/addnote <board>: <note>` with linked-account enforcement, board-title lookup in the linked workspace, structured sticky-note creation, and audit recording.
- `/remind` — create reminder.
- `/summarize` — summarize board.

## Setup

Create the bot:

1. Open Telegram and start a chat with `@BotFather`.
2. Run `/newbot`.
3. Choose the bot display name and username.
4. Store the token in `TELEGRAM_BOT_TOKEN`.
5. Generate a random webhook secret and store it in `TELEGRAM_WEBHOOK_SECRET`.

Local development:

- Use polling only for local experiments, or expose the local app through a temporary HTTPS tunnel.
- Do not commit the bot token or webhook secret.
- Keep Telegram disabled when `TELEGRAM_BOT_TOKEN` is empty.

Webhook deployment:

1. Deploy the app with an HTTPS public `APP_URL`.
2. Configure `TELEGRAM_BOT_TOKEN` and optional `TELEGRAM_WEBHOOK_SECRET`.
3. Run `npm run telegram:webhook` to set `APP_URL/api/telegram/webhook` through Telegram Bot API `setWebhook`.
4. Include the webhook secret through Telegram's `secret_token`; the route checks `x-telegram-bot-api-secret-token` when `TELEGRAM_WEBHOOK_SECRET` is set.
5. Verify webhook status with Telegram Bot API `getWebhookInfo`.

Important Telegram behavior:

- `getUpdates` polling and outgoing webhooks are mutually exclusive for receiving updates.
- Commands from unlinked Telegram users must be rejected before tool execution.
- Telegram update handlers must return quickly and avoid doing long-running work inline.

## Command handling

Implemented foundation:

- `POST /api/telegram/webhook` receives Telegram message updates, checks the configured webhook secret, dispatches text commands, and replies through Telegram `sendMessage`.
- `/start <token>` consumes a one-time web-issued link token and links the Telegram sender to the owning app user/workspace.
- `handleTelegramTextCommand` parses text commands and supports bot-addressed commands such as `/boards@BotName`.
- `/boards` calls `getActiveTelegramAccount` first and returns a link-required reply for unlinked Telegram users.
- Linked `/boards` requests list active boards from the linked account's workspace through existing board persistence helpers.
- `/tasks` uses the same linked-account guard and lists open tasks from the linked account's workspace through existing task persistence helpers.
- `/newboard <title>` uses the same linked-account guard, creates a board through existing board persistence helpers, and records a `board.created` audit event with actor type `telegram`.
- `/addnote <board>: <note>` uses the same linked-account guard, resolves a board by title in the linked workspace, creates a structured `sticky_note` canvas item, and records a `canvas_item.created` audit event with actor type `telegram`.
- Long board lists are capped in Telegram replies to keep mobile chat output readable.
- Long task lists are capped in Telegram replies and include priority/due date context when available.

`scripts/register-telegram-webhook.ts` registers the deployed webhook URL. It requires `TELEGRAM_BOT_TOKEN` and `APP_URL`, and uses `TELEGRAM_WEBHOOK_SECRET` when present.

## Account linking

Telegram requires a secure account linking flow before any command can execute.

Implemented foundation:

- `TelegramLinkToken` stores `ownerUserId`, `workspaceId`, a SHA-256 token hash, expiry, and one-time consumption state.
- Raw link tokens are returned only when issued and are never persisted.
- Link tokens expire after 15 minutes.
- `TelegramAccount` stores the linked Telegram user ID and profile metadata for the owning app user and default workspace.
- `consumeTelegramLinkToken` marks a token consumed and upserts the linked Telegram account in one database transaction.
- `getActiveTelegramAccount` is the required pre-command lookup; command handlers must reject missing or unlinked accounts before executing tools.
- `unlinkTelegramAccount` soft-unlinks an account by setting `unlinkedAt`.

Expected MVP flow:

1. An authenticated web action calls `createTelegramLinkTokenRecord` for the current user's workspace.
2. The web UI displays a bot deep link or `/start <token>` instruction.
3. The Telegram `/start` handler passes the token and Telegram sender profile to `consumeTelegramLinkToken`.
4. The bot confirms linking after a successful consume result.
5. Future Telegram command handlers call `getActiveTelegramAccount` before any persistent action.

Public unauthenticated token-issuing routes are intentionally not part of this foundation because the app does not have an auth layer yet.

## Message capture examples

```text
Add note to Ideas: build mobile visual assistant
```

```text
Remind me tomorrow at 9 to review launch board
```

```text
Create a board called Trip Plan
```

## File/photo capture

User can send a photo/file to Telegram and choose board target.

Assistant should be able to:

- Store file.
- Add image item to board.
- Add note/context.
- Reply with link.

## Safety

Persistent changes from Telegram must be auditable.

External actions and destructive actions require confirmation.

Account-link tokens are credentials. They must not be logged, stored in plaintext, or accepted after expiry or consumption.
