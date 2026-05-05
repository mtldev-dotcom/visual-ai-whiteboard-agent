# Assistant Tools

## Tool design principles

- Tools update structured data.
- Tools must validate inputs.
- Tools must check permissions.
- Tools must return clear structured results.
- Tool calls should be visible to the user as execution cards.
- Destructive tools require confirmation or safe undo/rollback.

## LLM adapter

The assistant runtime starts behind a provider-agnostic adapter in `src/server/assistant/llm.ts`.

Implemented providers:

- `local`: deterministic development/test adapter. No external network call. Returns a canned response echoing the last user message. Activated when `LLM_PROVIDER=local` or unset.
- `openrouter`: production provider using the `openai` npm SDK pointed at `https://openrouter.ai/api/v1`. Activated when `LLM_PROVIDER=openrouter` + `OPENROUTER_API_KEY` is set. Default model: `anthropic/claude-3-haiku`, overridable via `OPENROUTER_MODEL`.

Both adapters load Markdown assistant core context from `CORE.md`, `ASSISTANT.md`, `TOOLS.md`, `SKILLS.md`, and `RULES.md` through `src/server/core-files.ts` and inject it as the system message.

Additional providers must implement the same `LlmAdapter` interface and must not be called directly from UI components or canvas tools.

The `/api/chat` route owns the tool call loop: it calls the adapter, executes any returned tool calls through the tool registry, sends tool results back, and loops until the model returns a final text response.

The tool loop supports multiple rounds. For example, a delete request may first call `list_canvas_items` to identify the target item, then call `delete_canvas_item`, then write the final response. The final response pass receives tool results as authoritative grounding data. Board summaries and item answers must be based on returned tool output, not guessed from prior chat text.

Runtime context includes the selected board ID and current date/time. The assistant should use the selected board ID for board-specific tools, call `summarize_board` or `list_canvas_items` before answering questions about visible board contents, and convert relative reminder phrases such as "tomorrow" or "tmr" into ISO 8601 timestamps before calling `create_reminder`.

## Tool registry

The initial server-side registry is implemented in `src/server/assistant/tools.ts`.

It provides:

- Tool registration by unique name.
- Tool listing for assistant/runtime discovery.
- Per-tool input validation before execution.
- Structured success/error results for future execution cards.
- Permission level metadata matching the levels below.

Concrete board and canvas tools are tracked separately in Phase 3 and must register through this registry rather than bypassing it.

Board and canvas tools must verify workspace ownership before reading or mutating persistent objects. A board ID or item ID from another workspace must behave as not found.

## Implemented concrete tools

### create_board

Implemented in `src/server/assistant/board-tools.ts`.

Input:

- `title` string, required.
- `description` string, optional.

Behavior:

- Validates input before execution.
- Creates a board in the current workspace through the board persistence helper.
- Returns a structured output containing the board ID and title.
- Permission level: 1.

### create_sub_board

Implemented in `src/server/assistant/board-tools.ts`.

Input:

- `parentBoardId` string, required.
- `title` string, required.
- `description` string, optional.

Behavior:

- Validates input before execution.
- Verifies the parent board belongs to the current workspace.
- Creates a board linked to the provided parent board.
- Returns a structured output containing the new board ID, parent board ID, and title.
- Permission level: 1.

### add_canvas_item

Implemented in `src/server/assistant/canvas-tools.ts`.

Input:

- `boardId` string, required.
- `type` string, required.
- `x`, `y`, `width`, `height` finite numbers, required.
- `content` object, required.
- `style`, `metadata`, and `safetyMetadata` objects, optional.

Behavior:

- Validates structured item input before execution.
- Accepts `text`, `sticky_note`, `task_list`, `kanban`, `rich_text`, `reminders`, `markdown`, `image`, `link`, `board_link`, `html_widget`, `drawing`, `arrow`, `shape`, and `frame`.
- `board_link` content must include `targetBoardId`; execution verifies that the linked board belongs to the current workspace before writing.
- Verifies the target board belongs to the current workspace.
- Creates a canvas item in the current workspace and target board.
- Returns a structured output containing the item ID and type.
- Permission level: 1.

### update_canvas_item

Implemented in `src/server/assistant/canvas-tools.ts`.

Input:

- `itemId` string, required.
- Optional `x`, `y`, `width`, `height` finite numbers.
- Optional `content`, `style`, `metadata`, and `safetyMetadata` objects.

Behavior:

- Validates input before execution.
- Verifies the item belongs to the current workspace.
- Updates the canvas item through the persistence helper.
- Returns a structured output containing the item ID and type.
- Permission level: 1.

### delete_canvas_item

Implemented in `src/server/assistant/canvas-tools.ts`.

Input:

- `itemId` string, required.
- `confirmed` boolean, must be `true`.

Behavior:

- Requires explicit confirmation in tool input.
- Verifies the item belongs to the current workspace.
- Soft deletes the canvas item through the persistence helper.
- Returns a structured output containing the item ID.
- Permission level: 2.

### summarize_board

Implemented in `src/server/assistant/board-query-tools.ts`.

Input:

- `boardId` string, required.

Behavior:

- Verifies the board belongs to the current workspace.
- Reads all non-deleted canvas items on the board.
- Returns board title, description, item count, type breakdown, and item-level summaries with titles, readable text, task states, Kanban columns/cards, and positions.
- Permission level: 1.

### list_canvas_items

Implemented in `src/server/assistant/board-query-tools.ts`.

Input:

- `boardId` string, required.

Behavior:

- Verifies the board belongs to the current workspace.
- Returns item IDs, types, positions, sizes, and content for all non-deleted items.
- Use before updating or deleting existing board items.
- Permission level: 1.

## Execution cards

Final assistant text is rendered by the chat UI as structured Markdown-style content for readability. The renderer supports paragraphs, headings, bullet lists, numbered lists, bold spans, and inline code while keeping content React-escaped.

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

### generate_html_widget

Implemented in `src/server/assistant/widget-tools.ts`.

Input:

- `boardId` string, required.
- `title` string, required.
- `body` string, required.
- Optional `x`, `y`, `width`, `height` finite numbers.

Behavior:

- Escapes user-provided text into a safe static HTML document.
- Creates a `WidgetDefinition` with versioned custom HTML source.
- Stores initial source as `v1`.
- Adds an `html_widget` canvas item with `widgetDefinitionId`, `sourceVersion`, and sandbox confirmation metadata.
- Permission level: 4.

### rollback_html_widget

Implemented in `src/server/assistant/widget-tools.ts`.

Input:

- `itemId` string, required.
- `sourceVersion` string, required.

Behavior:

- Verifies the canvas item is an `html_widget` in the current workspace.
- Finds the requested prior `CustomHtmlWidgetSource` version.
- Copies that source into a new version and updates the canvas item HTML/source metadata.
- Permission level: 4.

### organize_board

Implemented in `src/server/assistant/board-management-tools.ts`.

Input:

- `boardId` string, required.
- `strategy` string, optional. One of `grid` (default), `rows`, `columns`.

Behavior:

- Verifies the board belongs to the current workspace.
- Fetches all non-deleted canvas items and sorts them by type then ID.
- Repositions items into a uniform grid, single row, or single column starting at (80, 80) with a 40px gap.
- Cell size is determined by the widest and tallest item across the board.
- Returns the number of items moved and the strategy applied.
- Permission level: 1.

### duplicate_board

Implemented in `src/server/assistant/board-management-tools.ts`.

Input:

- `boardId` string, required.
- `title` string, optional. Defaults to `Copy of <original title>`.

Behavior:

- Verifies the source board belongs to the current workspace.
- Creates a new top-level board with the given or derived title.
- Copies all non-deleted canvas items into the new board in a single database transaction.
- The original board is not modified.
- Returns the new board ID, title, and item count.
- Permission level: 1.

### rollback_canvas_change

Implemented in `src/server/assistant/board-management-tools.ts`.

Input:

- `itemId` string, required. Must be the ID of a soft-deleted canvas item.
- `confirmed` boolean, must be `true`.

Behavior:

- Requires explicit confirmation in tool input.
- Looks up the canvas item including soft-deleted rows.
- Verifies the item belongs to the current workspace and is currently soft-deleted.
- Clears `deletedAt` to restore the item on the board.
- The assistant should supply the `itemId` from the result of a prior `delete_canvas_item` call in the same conversation.
- Permission level: 2.
