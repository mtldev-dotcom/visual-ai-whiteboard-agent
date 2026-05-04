# 25 — LocalLlmAdapter

**File:** `src/server/assistant/llm.ts` (lines 42–66)

## Purpose

`LocalLlmAdapter` is a deterministic, zero-network development adapter. It requires no API keys and makes no external HTTP calls. It is the default adapter when `LLM_PROVIDER` is unset or explicitly set to `"local"`.

## Implementation

```tsx
class LocalLlmAdapter implements LlmAdapter {
  provider = "local";

  async complete(request: LlmRequest): Promise<LlmResponse> {
    const coreContext =
      request.coreContext === undefined
        ? await loadAssistantCoreContext()
        : request.coreContext;
    const lastUserMessage = [...request.messages]
      .reverse()
      .find((message) => message.role === "user");

    return {
      content: lastUserMessage
        ? `Local assistant received: ${lastUserMessage.content}`
        : "Local assistant is ready.",
      metadata: {
        coreContextCharacters: coreContext?.length ?? 0,
        coreContextLoaded: Boolean(coreContext),
      },
      provider: this.provider,
      toolCalls: [],
    };
  }
}
```

## Behavior Breakdown

### 1. Core Context Loading

```tsx
const coreContext =
  request.coreContext === undefined
    ? await loadAssistantCoreContext()
    : request.coreContext;
```

If the caller provided `coreContext`, use it. Otherwise, load it from the markdown core files via `loadAssistantCoreContext()`. This mirrors the OpenRouter adapter's behavior — both adapters can source their system prompt from the same place.

**Why duplicate this in both adapters?** The factory function decides which adapter to use, but core context loading is adapter-agnostic. By having each adapter handle its own fallback loading, the chat route doesn't need to worry about whether the adapter needs or uses core context.

### 2. Echo the Last User Message

```tsx
const lastUserMessage = [...request.messages]
  .reverse()
  .find((message) => message.role === "user");
```

The adapter finds the most recent user message in the conversation. This is used to construct a deterministic echo response.

**Why reverse-and-find instead of `findLast`?** `Array.prototype.findLast` wasn't available in the Node.js version targeted at the time. The spread + reverse pattern is compatible with all ES versions.

### 3. Deterministic Response

```tsx
content: lastUserMessage
  ? `Local assistant received: ${lastUserMessage.content}`
  : "Local assistant is ready."
```

The response echoes whatever the user said. This is useful for:
- **Testing the chat loop**: The route can verify that messages flow through the adapter → tool execution → response pipeline correctly.
- **UI development**: Frontend developers can build and test the chat UI without needing API keys.
- **Debugging**: If the chat route breaks, the "Local assistant received: ..." prefix makes it clear the issue isn't in the LLM.

### 4. Metadata

```tsx
metadata: {
  coreContextCharacters: coreContext?.length ?? 0,
  coreContextLoaded: Boolean(coreContext),
}
```

Two metadata fields for debugging:
- `coreContextCharacters`: Length of the loaded core context string. Useful for verifying core files are being loaded correctly.
- `coreContextLoaded`: Boolean indicating whether core context was successfully loaded.

### 5. No Tool Calls

```tsx
toolCalls: [];
```

The local adapter never generates tool calls. This is intentional — in development mode, the assistant is a simple echo. Tool execution testing is done through the tool registry directly, not through the LLM tool-calling path.

**Why not simulate tool calls?** Adding mock tool call generation to the local adapter would make it a test double for the LLM, not a development adapter. The current design keeps concerns separate: test tool execution separately, test LLM tool calling with the OpenRouter adapter.

## When to Use

| Scenario | Adapter |
|---|---|
| Development without API keys | `LocalLlmAdapter` (default) |
| Quick UI prototyping | `LocalLlmAdapter` |
| Testing the chat route pipeline | `LocalLlmAdapter` |
| Production / real AI responses | `OpenRouterLlmAdapter` |
| Testing LLM tool-calling behavior | `OpenRouterLlmAdapter` |

## Connection to the Factory

```tsx
export function createLlmAdapter(provider = process.env.LLM_PROVIDER): LlmAdapter {
  if (!provider || provider === "local") {
    return new LocalLlmAdapter();  // ← Default path
  }
  // ...
}
```

The local adapter is the **default** — it activates when:
- `LLM_PROVIDER` is not set in `.env`
- `LLM_PROVIDER=local` is explicitly set
- Any falsy value is provided

This is a deliberate choice for DX (developer experience). The app should run immediately after `npm install` without configuration.

## Design Notes

1. **No constructor**: The local adapter has zero configuration. No constructor parameters. It just works.

2. **`async` even though synchronous**: The `complete()` method is `async` because of the `await loadAssistantCoreContext()` call. Even though the echo logic itself is synchronous, the core context loading is async (it reads files from disk).

3. **No message accumulation**: Unlike real LLMs, the local adapter doesn't maintain conversation state. It only looks at the last user message. This is fine for development — the purpose is to verify pipeline connectivity, not to simulate conversation.

4. **TypeScript class, not plain object**: Both adapters are classes, not plain objects. This is a style choice — classes provide clear constructor patterns and `implements` checking. Plain objects would also work since `LlmAdapter` is a structural type.
