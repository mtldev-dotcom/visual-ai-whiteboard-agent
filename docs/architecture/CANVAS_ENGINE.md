# Canvas Engine

## Principle

The canvas is a renderer for structured board data.

Do not store the board as a screenshot, raw HTML page, or opaque blob.

## Canvas item requirements

Every canvas item must have:

- Stable ID.
- Board ID.
- Type.
- Position.
- Size.
- Content payload.
- Style payload.
- Metadata payload.
- Created/updated timestamps.
- Created-by marker.
- Soft-delete field or equivalent.
- Version/audit trail for assistant-made changes where possible.

## Initial item types

- `text`
- `sticky_note`
- `markdown`
- `image`
- `link`
- `iframe_embed`
- `html_widget`
- `task_list`
- `board_link`
- `section`
- `kanban`
- `drawing`
- `arrow`
- `shape`
- `frame`

## User interactions

MVP must support:

- Pan.
- Zoom.
- Select.
- Move.
- Resize.
- Undo the last move/resize with `Ctrl+Z` / `Cmd+Z`.
- Add.
- Edit simple text-bearing items inline.
- Delete.
- Open full screen for complex widgets.

The floating toolbar supports selection, panning, freehand drawing, drag-created
shapes, frames, arrows, text, sticky notes, task lists, widgets, color selection,
zoom, and tidy/organize. Freehand drawings and arrows are stored as structured
canvas items with their geometry in `content`; they are not screenshots or raw
HTML blobs.

## Mobile behavior

On mobile:

- Item controls appear in a bottom sheet.
- Complex widgets can open full screen.
- Board explorer is a drawer.
- Assistant is accessible through floating button.
- Do not depend on hover-only interactions.

## Assistant interactions

Assistant edits must use tools such as:

- `create_board`
- `create_sub_board`
- `add_canvas_item`
- `update_canvas_item`
- `delete_canvas_item`
- `move_canvas_item`
- `resize_canvas_item`
- `summarize_board`
- `organize_board`

Tools must validate input before writing.

## Change history

Canvas changes should be auditable.

Minimum MVP audit:

- Created by user/assistant/system.
- Updated timestamps.
- Tool call record for assistant actions.

Future:

- Full version history.
- Redo.
- Board snapshots.
