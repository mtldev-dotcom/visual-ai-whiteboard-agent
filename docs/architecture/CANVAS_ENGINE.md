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

## Item types

- `text`
- `sticky_note`
- `markdown`
- `image` — full-card image; `content.src` URL, optional `title` and `alt`
- `video` — HTML5 video player; `content.src` URL, optional `title`
- `audio` — HTML5 audio player with waveform decoration; `content.src` URL, optional `title`
- `iframe_embed` — sandboxed iframe; `content.src` must be an embed URL (not a watch URL). For YouTube: convert `youtube.com/watch?v=ID` → `youtube.com/embed/ID`
- `link`
- `html_widget`
- `task_list`
- `board_link`
- `section`
- `kanban`
- `rich_text`
- `reminders`
- `notes`
- `drawing`
- `arrow`
- `shape`
- `frame`

`board_link` items store `content.targetBoardId` plus optional `title` and `text`. They render as board navigation cards and must only target boards in the same workspace.

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
zoom, tidy/organize, and media upload.

**Desktop (`md:` and above):** horizontal bar centered at the bottom of the canvas.

**Mobile (below `md`):** vertical strip pinned to the right edge of the canvas,
vertically centered and scrollable. Shape sub-kinds appear in a secondary panel
to the left when the Shape tool is active. The color palette runs as a vertical
strip of swatches at the bottom of the panel.

Freehand drawings and arrows are stored as structured canvas items with their
geometry in `content`; they are not screenshots or raw HTML blobs.

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
