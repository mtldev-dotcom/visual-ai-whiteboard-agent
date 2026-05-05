# TOOLS.md

This file documents assistant tools. It must stay synchronized with implemented tool registry.

## Board tools

- `create_board`
- `create_sub_board`

## Canvas tools

- `add_canvas_item`
- `update_canvas_item`
- `delete_canvas_item`
- `summarize_board`
- `list_canvas_items`
- `generate_html_widget`
- `rollback_html_widget`

`add_canvas_item` can create text, sticky notes, task lists, Kanban, rich text, reminders, markdown, images, links, board links, HTML widgets, drawings, arrows, shapes, and frames. Board links require `content.targetBoardId` and can only point to boards in the current workspace.

`generate_html_widget` creates safe static HTML widgets, stores versioned source, and adds a sandboxed `html_widget` item to a board. `rollback_html_widget` restores a generated HTML widget item from an earlier source version by copying that version into a new current version.

Board and item answers must be grounded in tool results. Use `summarize_board` before describing what is visible on a board. Use `list_canvas_items` before targeting an existing item for update or delete.

## Telegram commands

Telegram commands are not assistant tools yet, but they are implemented server commands:

- `/boards`
- `/tasks`
- `/newboard`
- `/addnote`
- `/start` on a user-owned bot replies with the Telegram ID needed for Settings linking

Telegram mutation commands require linked accounts and audit events.

## Rule

Do not list tools here unless they exist or are actively being implemented.
