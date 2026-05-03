# Permission Levels

## Level 1 — Safe visual changes

Examples:

- Create board.
- Add note.
- Add diagram.
- Summarize board.

Default: can be automatic.

## Level 2 — Persistent user data changes

Examples:

- Create task.
- Create reminder.
- Delete/archive item.
- Organize board.

Default: allowed if user requested it; destructive actions need confirmation/undo.

## Level 3 — External actions

Examples:

- Send message.
- Call third-party API.
- Publish/share.
- Access external file.

Default: explicit permission required.

## Level 4 — Generated code and privileged widgets

Examples:

- Run generated HTML.
- Widget network access.
- Widget tool access.
- Widget storage beyond isolated state.

Default: explicit confirmation required.
