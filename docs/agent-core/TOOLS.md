# TOOLS.md

This file documents assistant tools. It must stay synchronized with implemented tool registry.

## Board tools

- `create_board`
- `create_sub_board`

## Canvas tools

- `add_canvas_item`
- `update_canvas_item`
- `delete_canvas_item`

## Telegram commands

Telegram commands are not assistant tools yet, but they are implemented server commands:

- `/boards`
- `/tasks`
- `/newboard`
- `/addnote`
- `/start <token>` for one-time Telegram account linking

Telegram mutation commands require linked accounts and audit events.

## Rule

Do not list tools here unless they exist or are actively being implemented.
