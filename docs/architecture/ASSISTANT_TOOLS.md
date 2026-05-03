# Assistant Tools

## Tool design principles

- Tools update structured data.
- Tools must validate inputs.
- Tools must check permissions.
- Tools must return clear structured results.
- Tool calls should be visible to the user as execution cards.
- Destructive tools require confirmation or safe undo/rollback.

## Initial tools

### create_board

Creates a new board in a workspace.

### create_sub_board

Creates a child board under an existing board.

### add_canvas_item

Adds a structured item to a board.

### update_canvas_item

Updates content, style, metadata, position, or size of an item.

### delete_canvas_item

Soft deletes an item. Hard delete should not be the default.

### summarize_board

Reads board items and creates a summary.

### organize_board

Groups, moves, renames, or restructures board items.

### duplicate_board

Copies a board and its items.

### rollback_canvas_change

Reverts a previous assistant/tool change where supported.

### create_task

Creates a task attached to workspace, board, or canvas item.

### create_reminder

Creates a reminder attached to workspace, board, canvas item, or task.

## Execution cards

Each assistant tool call should appear in chat as a card with:

- Tool name.
- Status.
- Human-readable summary.
- Link to affected object.
- Error message if failed.

## Tool permission levels

### Level 1 — Safe visual changes

Examples:

- Add note.
- Create board.
- Create diagram.
- Summarize board.

Usually allowed automatically.

### Level 2 — Persistent data changes

Examples:

- Create task.
- Create reminder.
- Archive item.

May require confirmation depending on settings.

### Level 3 — External actions

Examples:

- Send Telegram message.
- Send email.
- Call external API.

Requires explicit permission.

### Level 4 — Generated code/widgets

Examples:

- Run generated HTML.
- Network-enabled widget.
- Widget calling tools.

Requires sandboxing and explicit permission.
