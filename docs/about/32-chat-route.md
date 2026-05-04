# The Chat Route — Complete Walkthrough

`src/app/api/chat/route.ts` (385 lines) is the most important route in the application. It orchestrates the entire assistant interaction: receiving user messages, running the multi-step tool call loop, persisting results, and returning grounded responses.

## Request Shape

```typescript
POST /api/chat
Body: {
  messages: IncomingMessage[],  // user + assistant history pairs
  boardId?: string,             // currently selected board
  threadId?: string             // for chat persistence
}
```

**Authentication:** First two lines call `requireSession()`. Unauthorized requests get a 401 immediately.

```typescript
const { session, error } = await requireSession();
if (error) return error;
```

**Validation:** At least one message is required, or a 400 is returned.

## Tool Registry Setup

Each request creates a fresh `ToolRegistry` and registers all tool groups:

```typescript
const registry = createToolRegistry();
registerBoardTools(registry);        // create_board, create_sub_board
registerBoardQueryTools(registry);   // summarize_board, list_canvas_items
registerCanvasTools(registry);       // add/update/delete_canvas_item
registerTaskTools(registry);         // create/list tasks, create/list reminders
```

A fresh registry per request prevents state leakage between concurrent requests. All 11 tools are available to every chat call.

## Context Assembly

### Core Context (Markdown files)

```typescript
const coreContext = await loadAssistantCoreContext();
```

Reads `CORE.md`, `ASSISTANT.md`, `TOOLS.md`, `SKILLS.md`, and `RULES.md` from disk at `docs/agent-core/`, formats them into a single system prompt block. This is the assistant's "personality" and operating rules.

### Runtime Context (Dynamic)

`buildRuntimeContext(boardId)` composes a context string with:

- Current ISO date/time
- Timezone assumption (America/Toronto)
- Instructions to query before answering
- Authoritative grounding rule (trust tool results, not chat history)
- Board selection status
- The selected board's ID for tool targeting

Example:
```
Current date/time: 2026-05-04T14:30:00.000Z.
Assume the user's local timezone is America/Toronto.
When the user asks what is on the board, call summarize_board or list_canvas_items before answering.
Board and item tool results are authoritative. Never invent item titles, counts, or content.
A board is selected. Prefer using the selected board.
Current board ID: abc123. Use this exact boardId for board and canvas tools.
```

## The Tool Call Loop

This is the multi-step execution engine. It runs up to `MAX_TOOL_ROUNDS = 4` iterations:

```typescript
for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
  const response = await adapter.complete({
    messages: toolResultMessages,
    coreContext: /* context varies by round */,
    tools: llmToolDefs,
  });

  assistantContent = response.content;

  if (response.toolCalls.length === 0) {
    break;  // LLM finished, no more tools needed
  }

  // Execute each tool call
  for (const toolCall of response.toolCalls) {
    const normalizedInput = normalizeToolInput(
      toolCall.name, toolCall.input, { boardId: body.boardId }
    );
    const result = await registry.execute(
      toolCall.name, normalizedInput, toolContext
    );
    executedToolCalls.push({ toolName, status, summary, output });

    // Feed tool result back as a message
    toolResultMessages.push({
      role: "tool",
      content: JSON.stringify({
        toolCallId: toolCall.id,
        toolName: toolCall.name,
        input: normalizedInput,
        result,
      }),
    });
  }
}
```

**Round 0:** Full core context + runtime context injected. LLM sees the user message and all available tools.

**Rounds 1-3:** Tool follow-up context injected instead:
```
You are continuing after one or more tool calls.
For delete requests, call delete_canvas_item with confirmed=true after identifying the target.
Do not produce a final success message unless the mutation tool has succeeded.
```

This progressive context injection prevents the LLM from claiming success before an actual mutation completes.

## Input Normalization

`normalizeToolInput` solves a common problem: the LLM sometimes forgets to include `boardId` in tool calls, especially in follow-up rounds:

```typescript
function normalizeToolInput(
  toolName: string,
  input: Record<string, unknown>,
  context: { boardId?: string },
) {
  const normalized = { ...input };

  // Auto-inject boardId for board-specific tools
  if (context.boardId && BOARD_ID_TOOLS.has(toolName) && 
      typeof normalized.boardId !== "string") {
    normalized.boardId = context.boardId;
  }

  // Auto-inject boardId for task/reminder tools
  if (context.boardId && 
      (toolName === "create_task" || toolName === "create_reminder") &&
      normalized.boardId === undefined) {
    normalized.boardId = context.boardId;
  }

  return normalized;
}
```

`BOARD_ID_TOOLS` is `["add_canvas_item", "summarize_board", "list_canvas_items"]` — these always target a specific board, so the current board ID is injected automatically.

## Final Response Grounding

After the tool loop, if any tools were executed, the route makes one final adapter call with a special context:

```typescript
const finalResponse = await adapter.complete({
  messages: toolResultMessages,
  coreContext: buildFinalResponseContext(),
  tools: [],  // No tools available — LLM must produce text only
});
```

`buildFinalResponseContext` enforces grounding:
```
You are writing the final response after tool execution.
Use tool result data as authoritative.
For board summaries, mention actual item count, types, and titles from the tool result.
Do not mention items not present in the tool result.
If only list_canvas_items ran, say what you found; do not claim a mutation happened.
If a tool failed, explain the failure.
```

This is why board summaries use real data — the LLM sees actual item lists from `summarize_board` and cannot hallucinate content.

## Chat Persistence

`persistTurn` saves the conversation to the database:

```typescript
async function persistTurn(threadId, incomingMessages, toolCalls, assistantContent) {
  if (!threadId || !incomingMessages?.length) return;

  const toSave = [];
  toSave.push({ role: "user", content: lastUserMessage.content });
  for (const tc of toolCalls) {
    toSave.push({
      role: "tool",
      content: tc.summary,
      toolName: tc.toolName,
      toolStatus: tc.status,
    });
  }
  if (assistantContent) {
    toSave.push({ role: "assistant", content: assistantContent });
  }
  await appendMessages(threadId, toSave);
}
```

Messages are saved as: user → tool execution cards → assistant response. When the thread is loaded later (via `GET /api/chat/thread`), the full conversation history is reconstructed from `ChatMessage` records.

## Response Shape

```typescript
return NextResponse.json({
  content: assistantContent,     // Final text response
  toolCalls: executedToolCalls,  // Tool execution summary cards
});
```

Each tool call card has:
```typescript
{
  toolName: "add_canvas_item",
  status: "success",
  summary: "Added sticky_note item to board.",
  output: { itemId: "...", type: "sticky_note" }
}
```

## The Full Flow

```
POST /api/chat
  ├── requireSession() → 401 if no auth
  ├── Validate messages → 400 if empty
  ├── Create tool registry (fresh)
  ├── Register 11 tools
  ├── Load core context (5 Markdown files)
  ├── Build runtime context (date, board, instructions)
  │
  ├── LOOP (max 4 rounds):
  │   ├── Call LLM adapter
  │   ├── If no tool calls → break
  │   ├── For each tool call:
  │   │   ├── Normalize input (inject boardId if missing)
  │   │   ├── Execute via registry (validate + execute)
  │   │   └── Append tool result to message list
  │   └── Continue loop
  │
  ├── If tools executed → final grounding call (no tools available)
  ├── Persist turn to DB
  └── Return { content, toolCalls }
```

**Key files:** `src/app/api/chat/route.ts`, `src/server/assistant/llm.ts`, `src/server/assistant/tools.ts`
