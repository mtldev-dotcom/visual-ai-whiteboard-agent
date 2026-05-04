# AssistantPanel — Chat UI Component

`src/app/components/AssistantPanel.tsx` (372 lines) is the chat interface component. It handles message display, thread loading, tool execution cards, and canvas refresh coordination.

## Component Architecture

Client component with these props:

```typescript
type Props = {
  boardId: string | null;       // Current board for context
  onCanvasChanged?: () => void; // Callback to refresh canvas after tool calls
};
```

The panel is used in two locations:
- **Desktop:** Right sidebar (340px wide) in `WorkspaceShell`
- **Mobile:** Slide-up drawer (72dvh height) triggered by bottom nav

## Message Types

Three message roles are supported:

```typescript
type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
};

type ToolCard = {
  id: string;
  role: "tool";
  toolName: string;
  status: "success" | "error" | "pending";
  summary: string;
};

type Message = ChatMessage | ToolCard;
```

**Welcome message** is always the first displayed:
```typescript
const WELCOME: Message = {
  id: "welcome",
  role: "assistant",
  text: "I can help shape this board. Ask me to create boards, add notes, or organize your workspace.",
};
```

## Thread Loading

When `boardId` changes, the panel fetches chat history:

```typescript
useEffect(() => {
  const controller = new AbortController();
  async function loadThread() {
    setLoadingHistory(true);
    setMessages([WELCOME]);
    setThreadId(null);
    const url = boardId
      ? `/api/chat/thread?boardId=${boardId}`
      : `/api/chat/thread`;
    const res = await fetch(url, { signal: controller.signal });
    const data = await res.json();
    setThreadId(data.threadId);
    if (data.messages.length > 0) {
      setMessages(data.messages.map(dbToMessage));
      scrollToBottom();
    }
  }
  void loadThread();
  return () => controller.abort();
}, [boardId, scrollToBottom]);
```

Key behaviors:
- Uses `AbortController` to cancel in-flight requests when board changes rapidly
- Thread ID is received from the server (server manages thread lifecycle)
- History messages are mapped from DB format to UI format via `dbToMessage`
- If no history exists, only the welcome message is shown

## DB to UI Message Mapping

```typescript
function dbToMessage(m: DbMessage): Message {
  if (m.role === "tool") {
    return {
      id: m.id,
      role: "tool",
      toolName: m.toolName ?? "tool",
      status: (m.toolStatus as "success" | "error") ?? "success",
      summary: m.content,
    };
  }
  return {
    id: m.id,
    role: m.role as "user" | "assistant",
    text: m.content,
  };
}
```

Tool messages from DB carry `toolName` and `toolStatus` as nullable fields — the UI provides defaults if they're missing.

## Message Submission Flow

```typescript
async function submitMessage(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  const text = draft.trim();
  if (!text || pending) return;

  // 1. Add user message immediately
  const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", text };
  setMessages((prev) => [...prev, userMsg]);
  setDraft("");
  setPending(true);

  // 2. Show pending indicator
  const pendingCard: ToolCard = {
    id: `pending-${Date.now()}`,
    role: "tool",
    toolName: "thinking",
    status: "pending",
    summary: "Working on it…",
  };
  setMessages((prev) => [...prev, pendingCard]);

  // 3. Build history (filter to user + assistant only)
  const history = [...messages, userMsg]
    .filter((m): m is ChatMessage => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role, content: m.text }));

  // 4. Call chat API
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: history, boardId, threadId }),
  });

  // 5. Process response
  const data = await res.json();
  setMessages((prev) => prev.filter((m) => m.id !== pendingCard.id));

  // 6. Add tool execution cards
  for (const tc of data.toolCalls || []) {
    setMessages((prev) => [...prev, {
      id: `tc-${Date.now()}-${tc.toolName}`,
      role: "tool",
      toolName: tc.toolName,
      status: tc.status,
      summary: tc.summary,
    }]);
  }

  // 7. Add assistant text response
  if (data.content) {
    setMessages((prev) => [...prev, {
      id: `a-${Date.now()}`,
      role: "assistant",
      text: data.content,
    }]);
  }

  // 8. Refresh canvas if tools changed things
  onCanvasChanged?.();

  setPending(false);
  scrollToBottom();
}
```

**Optimistic UI:**
1. User message appears instantly (no loading state for send)
2. "Working on it…" pending card shows immediately
3. Both are replaced/removed when the real response arrives
4. Success/error cards appear one at a time as tool calls complete

## Tool Card Rendering

Tool cards display in the chat with distinct styling:

- **Pending** (spinner icon, muted color): `"Working on it…"` while waiting
- **Success** (check icon, green): Summary of what happened (e.g., `"Added sticky_note item to board."`)
- **Error** (X icon, red): Error message (e.g., `"Board not found."`)

Each card shows the tool name and summary text. Status is communicated through both iconography and color.

## Canvas Refresh

After tool calls that modify board state, `onCanvasChanged?.()` is called. This bubbles up through `WorkspaceShell` to increment `canvasRefreshKey`, triggering `BoardCanvas` to re-fetch items from the API.

```typescript
// In WorkspaceShell:
const refreshCanvas = useCallback(() => {
  setCanvasRefreshKey((k) => k + 1);
}, []);

// Passed to AssistantPanel:
<AssistantPanel
  boardId={activeBoardId}
  onCanvasChanged={refreshCanvas}
/>
```

## Auto-Scroll

The chat auto-scrolls to the bottom on new messages:

```typescript
const scrollToBottom = useCallback(() => {
  setTimeout(
    () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
    50,
  );
}, []);
```

The 50ms delay ensures the DOM has updated from the latest state change before scrolling.

## State Summary

| State Variable | Purpose |
|---|---|
| `messages` | All visible chat items (welcome + history + active conversation) |
| `threadId` | Server-assigned thread ID for persistence |
| `draft` | Current input text |
| `pending` | Block input while request is in-flight |
| `loadingHistory` | Show loading state while fetching thread |

## Mobile Considerations

On mobile, the AssistantPanel renders in a fixed slide-up drawer (72dvh height). The input stays at the bottom of the drawer, messages scroll above it. The drawer has a header with title and close button. Tapping outside closes the drawer via overlay click.

**Key files:** `src/app/components/AssistantPanel.tsx`, `src/app/api/chat/route.ts`, `src/app/api/chat/thread/route.ts`
