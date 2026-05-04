# Board Tools Deep Dive

`src/server/assistant/board-tools.ts` implements two tools that create boards and sub-boards through the structured tool registry.

## Tool Definitions

### `create_board` — Create a Board

Creates a top-level board in the current workspace. This is the most common board creation path.

**Input:**

| Field | Type | Required | Description |
|---|---|---|---|
| `title` | string | Yes | Board name (whitespace-trimmed) |
| `description` | string | No | Optional text description |

**Validation flow (`validateCreateBoardInput`):**

```
isObject(input)? → title is non-empty string? → description is string or absent?
                                                    ↓
                                               { ok: true }
```

The validator rejects non-object inputs, empty/missing titles, and non-string descriptions.

**Execution flow:**

```
validate → actorToCreatedBy(context.actor.type)
           → createBoard({ workspaceId, title, description, createdBy })
           → return { boardId, title }
```

The `actorToCreatedBy` function normalizes the creator marker:

```typescript
function actorToCreatedBy(actorType: string) {
  if (actorType === "assistant" || actorType === "system") {
    return actorType;
  }
  return "user";
}
```

This means boards created via chat show `createdBy: "assistant"` in the database, while boards created by named users through the API show `createdBy: "user"`.

### `create_sub_board` — Create a Sub-Board

Creates a board that belongs to a parent board. Sub-boards are regular boards with a `parentBoardId` set — they appear in the board explorer and can themselves have sub-boards.

**Input:**

| Field | Type | Required | Description |
|---|---|---|---|
| `parentBoardId` | string | Yes | ID of the parent board |
| `title` | string | Yes | Sub-board name |
| `description` | string | No | Optional description |

**Validation flow:**

First, the base board validation runs (title + description). Then the parentBoardId is validated:

```
validateCreateBoardInput(input) passes? → parentBoardId is non-empty string?
                                                ↓
                                           { ok: true }
```

**Execution flow:**

The critical security check: before creating the sub-board, the tool verifies the parent board exists AND belongs to the same workspace:

```typescript
const parentBoard = await getBoardById(input.parentBoardId);
if (!parentBoard || parentBoard.workspaceId !== context.workspaceId) {
  return { ok: false, summary: "Parent board not found." };
}
```

This prevents cross-workspace sub-board creation — a user in workspace A cannot use a board ID from workspace B to create sub-boards.

## Registration

Both tools register with permission level 1 (safe visual changes) — no confirmation dialog needed:

```typescript
export function registerBoardTools(registry: ToolRegistry) {
  registry.register(createBoardTool);
  registry.register(createSubBoardTool);
}
```

## Tool Specifications for the LLM

The chat route exposes these tools to the LLM via `getToolInputSchema`:

**create_board:**
```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["title"],
  "properties": {
    "title": { "type": "string" },
    "description": { "type": "string" }
  }
}
```

**create_sub_board:**
```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["parentBoardId", "title"],
  "properties": {
    "parentBoardId": { "type": "string" },
    "title": { "type": "string" },
    "description": { "type": "string" }
  }
}
```

The `additionalProperties: false` constraint prevents the LLM from sending unexpected fields.

## How They Fit Together

In a typical chat interaction:

1. User: "Create a board called Sprint Planning"
2. LLM calls `create_board` with `{ title: "Sprint Planning" }`
3. Tool validates → creates board in user's workspace → returns `{ boardId: "...", title: "Sprint Planning" }`
4. LLM receives tool result, responds: "I created a board called Sprint Planning."

For sub-boards, the flow is similar but the LLM must know the parent board ID — typically from the current board context or from a prior `list_canvas_items` call.

**Key files:** `src/server/assistant/board-tools.ts`, `src/server/assistant/board-tools.test.ts`, `src/db/boards.ts`
