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
- Accepts `text`, `sticky_note`, `task_list`, `kanban`, `markdown`, `image`, `link`, `html_widget`, `drawing`, `arrow`, `shape`, and `frame`.
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
