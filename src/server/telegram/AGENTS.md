# Telegram Server Contract

This folder owns server-side Telegram integration logic.

Rules:

- Never log bot tokens, webhook secrets, or account-link tokens.
- Store only hashes of account-link tokens.
- Reject unlinked Telegram users before executing board, task, reminder, or assistant tools.
- Keep command handlers thin; persistent changes should go through existing typed helpers and future audit paths.
- Update `docs/architecture/TELEGRAM_INTEGRATION.md` when link flow, command behavior, or safety boundaries change.
