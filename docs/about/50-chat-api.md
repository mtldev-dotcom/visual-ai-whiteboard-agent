# 50 — Chat API (`/api/chat` and `/api/chat/thread`)

The chat API is the communication bridge between the user and the AI assistant. It handles LLM orchestration, tool execution, and conversation persistence.

## Files referenced

- `src/app/api/chat/route.ts` — POST (send messages, get AI response + tool calls)
- `src/app/api/chat/thread/route.ts` — GET (get or create chat thread, load history)
- `src/db/chat.ts` — `getOrCreateThreadForBoard`, `listMessagesForThread`, `appendMessages`
- `src/server/assistant/llm.ts` — `createLlmAdapter`
- `src/server/assistant/tools.ts` — `createToolRegistry`
- `src/server/assistant/board-tools.ts`, `board-query-tools.ts`, `canvas-tools.ts`, `task-tools.ts` — tool registrations

## POST /api/chat — Complete architecture summary

The POST `/api/chat` handler is the most complex endpoint in the application. It orchestrates the full AI conversation loop: loading core context, registering tools, calling the LLM in a multi-round tool-use loop, and persisting completed turns.

> **Full implementation is detailed in chapter 32.** This chapter recaps the key points so you understand the endpoint's role in the API surface and then focuses on the thread endpoint.

### Recap: POST /api/chat structure

```
POST /api/chat
  Body: { messages, boardId?, threadId? }
  
  1. requireSession()
  2. Validate messages is non-empty
  3. Create tool registry, register all assistant tools
  4. Build tool definitions for LLM (tool schemas per chapter 46)
  5. Load assistant core context from docs/agent-core/ (chapter 12)
  6. Build runtime context (date, timezone, board awareness)
  7. Multi-round tool-calling loop (max MAX_TOOL_ROUNDS=4 rounds):
     a. Call LLM adapter with messages + core context + tool defs
     b. If no tool calls → break (final answer)
     c. Execute each tool call via registry
     d. Append tool results to message history
     e. Loop back to (a)
  8. If tool calls executed → final summarization call to LLM
  9. persistTurn() — save turn to thread if threadId provided
  10. Return { content, toolCalls[] }
```

### Key constants

```typescript
const MAX_TOOL_ROUNDS = 4;

const BOARD_ID_TOOLS = new Set([
  "add_canvas_item",
  "summarize_board",
  "list_canvas_items",
]);
```

- `MAX_TOOL_ROUNDS = 4`: Prevents infinite tool-calling loops. The LLM gets up to 4 rounds to call tools.
- `BOARD_ID_TOOLS`: When a `boardId` is sent in the request, these tools automatically receive it via `normalizeToolInput()` if not explicitly provided.

### Persistence

At the end of every turn, if a `threadId` is provided, the turn is persisted via `appendMessages(threadId, messages)`. Each saved message includes:

- User messages (role: `"user"`)
- Tool call results (role: `"tool"`, with `toolName` and `toolStatus`)
- Assistant final response (role: `"assistant"`)

### Response shape

```typescript
{
  content: string | null,          // Assistant's final text response
  toolCalls: ChatToolCall[]        // Array of executed tool calls
}

type ChatToolCall = {
  toolName: string;
  status: "success" | "error";
  summary: string;
  output?: unknown;
};
```

## GET /api/chat/thread — Load or create a chat thread

The thread endpoint enables chat history persistence. It creates a thread scoped to a board (or workspace-level if no boardId provided) and returns the thread's ID and message history.

### Purpose

Without the thread endpoint, chat history would be lost on page refresh. The thread endpoint:
1. Creates a unique thread for each board + workspace combination
2. Returns all previously persisted messages
3. Provides a `threadId` that the client sends with subsequent `POST /api/chat` requests to persist new turns

### Flow

1. `requireSession()`
2. Parse `?boardId=` query param (can be null for workspace-level chat)
3. `getOrCreateThreadForBoard(session.workspaceId, boardId)` — creates or reuses a thread
4. `listMessagesForThread(thread.id)` — fetches all messages for the thread
5. Return `{ threadId, messages[] }`

### Implementation

```typescript
// src/app/api/chat/thread/route.ts
import { NextResponse } from "next/server";
import { getOrCreateThreadForBoard, listMessagesForThread } from "@/db/chat";
import { requireSession } from "@/lib/session";

export async function GET(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const boardId = searchParams.get("boardId") ?? null;

  const thread = await getOrCreateThreadForBoard(
    session.workspaceId,
    boardId
  );
  const messages = await listMessagesForThread(thread.id);

  return NextResponse.json({
    threadId: thread.id,
    messages,
  });
}
```

### Thread scoping

Threads are scoped to `(workspaceId, boardId)`. When `boardId` is null, the thread is workspace-level (general chat not tied to a specific board). When `boardId` is provided, the thread is board-specific.

**Why board-scoped threads.** Each board is an independent context. The assistant's core context and available tools change based on the active board. Keeping threads separate prevents cross-contamination — you don't want "summarize project Alpha" to pull context from a thread about project Beta.

The `getOrCreateThreadForBoard` function implements "get or create" semantics: if a thread already exists for the given (workspaceId, boardId) pair, it returns the existing thread. Otherwise, it creates a new one. This is idempotent — calling it multiple times with the same parameters returns the same thread.

### Message history

`listMessagesForThread(thread.id)` returns all messages for the thread, ordered by creation time. The message type is:

```typescript
{
  id: string;
  threadId: string;
  role: "user" | "assistant" | "tool";
  content: string;
  toolName?: string;
  toolStatus?: "success" | "error";
  createdAt: Date;
}
```

The client reconstructs the conversation UI from this history.

### Client usage pattern

```typescript
// Typical client flow:
// 1. On board switch → load thread
const res = await fetch(`/api/chat/thread?boardId=${activeBoardId}`);
const { threadId, messages } = await res.json();

// 2. Display history in chat UI
setMessages(messages);

// 3. When user sends a message → include threadId
const chatRes = await fetch("/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    messages: [...history, { role: "user", content: "Summarize this board" }],
    boardId: activeBoardId,
    threadId: threadId,  // Persist this turn
  }),
});
```

## Tool execution flow (recap from chapter 32)

When the LLM decides to call a tool (e.g., `add_canvas_item`):

```
POST /api/chat  →  LLM returns tool call
                     ↓
               registry.execute("add_canvas_item", input, context)
                     ↓
               tool handler creates data via POST /api/canvas-items
                     ↓
               result returned to LLM as tool message
                     ↓
               LLM generates final response referencing the result
                     ↓
               turn persisted to thread via /api/chat/thread
```

Tool execution within the chat handler is synchronous within a single request. The client waits for the full tool loop to complete before receiving the response. This keeps the API simple (no WebSocket, no polling) at the cost of potentially longer response times for multi-tool operations.

## Error handling

The chat endpoint has an additional error mode: LLM adapter failures. If the LLM provider is unavailable, the adapter throws, which results in a 503 error. Other errors follow the standard pattern:

| Scenario | Status | Response |
|----------|--------|----------|
| Not authenticated | 401 | `{ error: "Unauthorized." }` |
| Missing messages | 400 | `{ error: "messages is required." }` |
| LLM unavailable | 503 | (adapter error) |

## Why thread persistence matters

Without thread persistence:
- Chat history disappears on refresh
- Context is lost between page loads
- The assistant cannot reference previous conversations
- Long conversational workflows (plan → implement → refine) are impossible

With thread persistence:
- Conversations survive page refreshes and browser restarts
- The assistant has full context of past interactions
- Users can have ongoing, multi-turn conversations per board
- The chat UI can show message history on load

The separation of concerns is clean: `POST /api/chat` handles the real-time AI interaction, and `GET /api/chat/thread` handles history. The client composes them together.
