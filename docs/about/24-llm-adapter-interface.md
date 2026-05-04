# 24 — LLM Adapter Interface

**File:** `src/server/assistant/llm.ts` (171 lines)

## Purpose

The LLM Adapter interface abstracts away the specific AI provider so that the chat route and tool execution system never need to know whether they're talking to OpenRouter, Anthropic, OpenAI, or a local dev stub.

## Core Types

### LlmRole

```tsx
export type LlmRole = "system" | "user" | "assistant" | "tool";
```

Standard chat roles. `tool` is for tool execution results sent back to the model for grounding.

### LlmMessage

```tsx
export type LlmMessage = {
  role: LlmRole;
  content: string;
};
```

A single chat message. The `content` is always a string — no support for multimodal (image) content in the current interface.

**Why string-only?** The whiteboard assistant works with text descriptions of boards. Multimodal support (screenshots of the board) would be useful but adds complexity that hasn't been needed yet.

### LlmToolDefinition

```tsx
export type LlmToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};
```

A tool description sent to the model so it knows what tools are available and what parameters they accept. `inputSchema` is a JSON Schema object — different providers may interpret subsets of JSON Schema differently.

**Why `Record<string, unknown>` instead of a typed JSON Schema?** This keeps the adapter interface provider-agnostic. The OpenRouter adapter passes these schemas directly to OpenAI function-calling format. A future Anthropic adapter would map them to Anthropic's tool format. Keeping them untyped at the interface level avoids coupling to one provider's type system.

### LlmRequest

```tsx
export type LlmRequest = {
  messages: LlmMessage[];
  coreContext?: string | null;
  tools?: LlmToolDefinition[];
};
```

The input to `complete()`. All fields are optional because:
- `messages`: Required in practice, but the interface doesn't enforce it.
- `coreContext`: The assistant's system prompt (loaded from markdown core files). When omitted, adapters load it themselves via `loadAssistantCoreContext()`.
- `tools`: Available tool definitions. When omitted, the model is in "chat-only" mode.

### LlmToolCall

```tsx
export type LlmToolCall = {
  id: string;
  name: string;
  input: Record<string, unknown>;
};
```

A parsed tool call from the model. `id` is the provider's call identifier (used to correlate tool results with tool calls). `name` maps to a registered tool name. `input` is the parsed JSON arguments.

### LlmResponse

```tsx
export type LlmResponse = {
  content: string;
  metadata?: Record<string, unknown>;
  toolCalls: LlmToolCall[];
  provider: string;
};
```

The output of `complete()`. Contains:
- `content`: The model's text response (may be empty if only tool calls were generated).
- `toolCalls`: Parsed tool calls that the chat route should execute.
- `metadata`: Provider-specific metadata (model name, finish reason, token usage, core context stats).
- `provider`: The provider identifier string.

## The LlmAdapter Interface

```tsx
export type LlmAdapter = {
  provider: string;
  complete(request: LlmRequest): Promise<LlmResponse>;
};
```

This is intentionally minimal — one method plus a provider identifier. This is enough for the chat route to:

1. Send messages to the model.
2. Get text responses and/or tool calls back.
3. Feed tool results back to the model.

The interface is defined as a **type alias** (not an abstract class or interface keyword). TypeScript's structural typing means any object matching this shape is a valid adapter — no `implements` clause needed.

## Factory Function

```tsx
export function createLlmAdapter(provider = process.env.LLM_PROVIDER): LlmAdapter {
  if (!provider || provider === "local") {
    return new LocalLlmAdapter();
  }
  if (provider === "openrouter") {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set.");
    const model = process.env.OPENROUTER_MODEL ?? "anthropic/claude-3-haiku";
    return new OpenRouterLlmAdapter(apiKey, model);
  }
  throw new Error(`Unsupported LLM provider: ${provider}`);
}
```

**Key behaviors:**

- **Default to local**: If `LLM_PROVIDER` is unset or "local", the `LocalLlmAdapter` is used. This means the app works immediately after cloning — no API key needed.
- **OpenRouter gate**: If "openrouter" is set but `OPENROUTER_API_KEY` is missing, the factory throws at creation time. This fails fast rather than producing confusing "auth error" responses from the API.
- **Default model**: `anthropic/claude-3-haiku` — chosen for its balance of speed, cost, and quality. It's the cheapest Claude model on OpenRouter.
- **Not a singleton**: `createLlmAdapter()` is called once per request in the chat route. Each adapter instance is short-lived.

**Why a factory function instead of a DI container?** The project uses no DI framework. A simple function that reads environment variables and returns the right implementation is the simplest correct abstraction.

## Why This Abstraction Exists

Without the adapter interface, the chat route would need:

```tsx
// BAD: Provider-specific code in the route handler
if (provider === "openrouter") {
  const client = new OpenAI({ baseURL: "https://openrouter.ai/api/v1", apiKey });
  const result = await client.chat.completions.create({ model, messages, tools });
  // parse tool calls from OpenAI format
} else if (provider === "local") {
  // echo the last message
} else if (provider === "anthropic") {
  // use @anthropic-ai/sdk
}
```

This would mean every route that uses LLM needs its own provider switch. With the adapter:

```tsx
// GOOD: Provider-agnostic
const adapter = createLlmAdapter();
const response = await adapter.complete({ messages, tools });
```

The adapter encapsulates:
1. SDK initialization (API key, base URL, headers).
2. Message format conversion (LlmMessage → provider-specific format).
3. Tool definition conversion (LlmToolDefinition → provider tool format).
4. Response parsing (provider response → LlmResponse).
5. Error handling patterns specific to each provider.

Adding a new provider (e.g., direct Anthropic API) requires only a new adapter class plus a new branch in the factory function. No route code changes.
