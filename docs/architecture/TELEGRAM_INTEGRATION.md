# Telegram Integration

## Purpose

Telegram is a quick control and capture surface for the assistant.

It should not become a separate product. It should operate on the same workspace, tools, permissions, and audit model as the web app.

## MVP commands

- `/boards` — list recent boards.
- `/tasks` — list today or open tasks.
- `/newboard` — create board.
- `/addnote` — add note to board.
- `/remind` — create reminder.
- `/summarize` — summarize board.

## Account linking

Telegram must require a secure account linking flow.

Basic requirements:

- User starts linking from web app or bot.
- Link token is short-lived.
- Telegram user ID is stored after verification.
- User can unlink Telegram.
- Bot must reject commands from unlinked users.

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
