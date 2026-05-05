# MVP Scope

## MVP thesis

Prove that an AI assistant can create and edit useful visual boards from chat.

## Must have

- Auth or simple user identity.
- Workspace.
- Boards.
- Sub-boards.
- Canvas items.
- Mobile-first board UI.
- Assistant chat.
- Tool calls for board creation and canvas item creation.
- Execution cards in chat.
- Basic widgets.
- Sandboxed custom HTML iframe widget.
- Task/reminder primitives.
- Telegram quick capture.
- Markdown core files.

## Initial canvas item types

- Text.
- Sticky note.
- Markdown.
- Image.
- Link.
- Iframe embed.
- HTML widget.
- Task list.
- Rich text.
- Reminders.
- Board link.
- Freehand drawing.
- Arrow.
- Shape.
- Frame.

## Initial assistant tools

- `create_board`
- `create_sub_board`
- `add_canvas_item`
- `update_canvas_item`
- `delete_canvas_item`
- `summarize_board`
- `organize_board`
- `create_task`
- `create_reminder`
- `generate_html_widget`
- `rollback_html_widget`

## Initial Telegram commands

- `/boards`
- `/tasks`
- `/newboard`
- `/addnote`
- `/remind`
- `/summarize`

## Explicitly out of MVP

- Advanced shape/vector editing.
- Infinite plugin marketplace.
- Native iOS/Android app.
- Multi-user realtime editing.
- Public sharing permissions.
- Full automation builder.
