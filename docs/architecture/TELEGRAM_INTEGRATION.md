# Telegram Integration

## Purpose

Telegram is a quick control and capture surface for the assistant.

It should not become a separate product. It operates on the same workspace, persistence helpers, permissions, and audit model as the web app.

## Implemented Commands

- `/start` - records the sender's Telegram identity for the currently connected user-owned bot and replies with the Telegram user ID to paste into Settings.
- `/boards` - lists up to 10 active boards from the linked workspace.
- `/tasks` - lists up to 10 open tasks from the linked workspace.
- `/newboard <title>` - creates a board and records a `board.created` audit event with actor type `telegram`.
- `/addnote <board>: <note>` - creates a structured `sticky_note` canvas item and records a `canvas_item.created` audit event with actor type `telegram`.

Planned commands: `/remind`, `/summarize`, photo/file capture, and voice transcription.

## User-Owned Bot Setup

Telegram setup is initiated from `/settings`.

1. User opens Telegram and starts a chat with `@BotFather`.
2. User runs `/newbot`, chooses a display name and username, and copies the token.
3. User pastes the token in `/settings` and clicks **Connect token**.
4. The server validates the token with Telegram `getMe`, encrypts it with `APP_ENCRYPTION_KEY`, creates a per-bot webhook secret, and registers `APP_URL/api/telegram/webhook/[connectionId]` using `setWebhook`.
5. User sends `/start` to the new bot.
6. The bot replies with `Your Telegram ID is <id>. Paste this ID in Settings and click Connect ID.`
7. User pastes the ID in `/settings` and clicks **Connect ID**.
8. Commands from that Telegram user ID are accepted for that bot connection.

Deployment requirements:

- `APP_URL` must be a public HTTPS URL for live Telegram webhooks.
- `APP_ENCRYPTION_KEY` must be a 32-byte base64 value or 64-character hex value.
- Deployment-level `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, and `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` are no longer used for the settings flow.

## Webhook Handling

- `POST /api/telegram/webhook/[connectionId]` receives Telegram message updates for one saved bot connection.
- The route validates `X-Telegram-Bot-Api-Secret-Token` against the stored webhook secret hash before processing.
- The route decrypts the saved bot token only server-side and uses it for Telegram `sendMessage`.
- `POST /api/telegram/webhook` does not process global bot updates; it exists only as a health-safe legacy endpoint.
- Telegram update handlers return quickly and only support private-message text commands for this implementation.

## Data and Linking

- `TelegramBotConnection` stores one active bot per app user/workspace, including bot metadata, encrypted token material, token hash, webhook secret hash, and optional revocation timestamp.
- `TelegramStartIdentity` stores recent `/start` senders for a bot connection. IDs expire after 15 minutes and must match before Settings can link an account.
- `TelegramAccount` stores the linked Telegram user ID, chat ID, profile metadata, owning app user, workspace, and bot connection.
- Command handlers call `getActiveTelegramAccount(botConnectionId, telegramUserId)` before reads or writes.
- Removing a bot soft-revokes the bot connection, best-effort deletes the Telegram webhook, and unlinks the Telegram account.

## Safety

- Raw BotFather tokens are never returned to the browser after submit and are never logged.
- Tokens are encrypted at rest with AES-256-GCM using `APP_ENCRYPTION_KEY`.
- Webhook secrets are stored as SHA-256 hashes only.
- Commands from unlinked Telegram users are rejected before tool execution.
- Persistent mutations from Telegram must record audit events.
