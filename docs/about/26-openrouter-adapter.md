# 26 — OpenRouterLlmAdapter

**File:** `src/server/assistant/llm.ts` (lines 68–154)

## Purpose

`OpenRouterLlmAdapter` connects the assistant to real LLMs through OpenRouter's API. It uses the OpenAI SDK (which OpenRouter's API is compatible with) to send chat completion requests and parse responses.

## Constructor

```tsx
class OpenRouterLlmAdapter implements LlmAdapter {
  provider = "openrouter";
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.model = model;
    this.client = new OpenAI({
      apiKey,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": process.env.APP_URL ?? "http://localhost:3000",
        "X-Title": "Visual AI Whiteboard",
      },
    });
  }
```

**Why the OpenAI SDK?** OpenRouter exposes an OpenAI-compatible API. Using the official `openai` npm package gives us:
- Type-safe request/response types.
- Automatic retry logic.
- Proper error handling for rate limits and server errors.
- No need to write HTTP request plumbing.

**Why `HTTP-Referer` and `X-Title`?** These are OpenRouter-specific headers for:
- `HTTP-Referer`: Identifies where API calls originate. OpenRouter uses this for analytics and may rank apps on their platform.
- `X-Title`: Human-readable application name shown in OpenRouter's dashboard.

**Why not set `baseURL` to Anthropic/OpenAI directly?** OpenRouter provides a unified interface to many models. By going through OpenRouter instead of directly to Anthropic, the app can switch models (Claude to GPT, for example) by changing an environment variable without code changes.

## Message Mapping

### Standard Roles

```tsx
for (const m of request.messages) {
  if (m.role === "system" || m.role === "user" || m.role === "assistant") {
    messages.push({ role: m.role, content: m.content });
  }
```

`system`, `user`, and `assistant` roles pass through directly. The OpenAI SDK already handles these correctly for the `chat.completions.create` API.

### Tool Role → User Role Grounding

```tsx
else if (m.role === "tool") {
  messages.push({
    role: "user",
    content: `Tool result for grounding. Use this data as authoritative and do not invent board or item details:\n${m.content}`,
  });
}
```

**Why convert `tool` to `user`?** Some models on OpenRouter (particularly Anthropic's Claude through the OpenAI-compatible API) don't support the native `tool` role. Wrapping tool results as user messages with explicit grounding instructions achieves the same effect — the model treats the tool output as authoritative data.

The prefix `"Tool result for grounding..."` serves as a behavioral prompt:
- **"Use this data as authoritative"**: Prevents the model from contradicting tool results.
- **"Do not invent board or item details"**: Prevents hallucination. The model sometimes "helpfully" adds details that don't exist.

**Why JSON.stringify the tool result?** The tool result object (containing `toolCallId`, `toolName`, `input`, and `result`) is serialized as JSON and embedded in the message content. The model receives the full structured result, including input parameters and execution output.

### System Message Placement

```tsx
if (coreContext) {
  messages.push({ role: "system", content: coreContext });
}
```

The core context (loaded from markdown files) is sent as the first system message. This establishes the assistant's personality, capabilities, and constraints before any conversation messages.

## Tool Definition Mapping

```tsx
const tools: OpenAI.Chat.ChatCompletionTool[] | undefined =
  request.tools && request.tools.length > 0
    ? request.tools.map((t) => ({
        type: "function" as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.inputSchema,
        },
      }))
    : undefined;
```

`LlmToolDefinition` → OpenAI function-calling format. The `inputSchema` (JSON Schema object) becomes the `parameters` field. This is standard OpenAI function-calling — `type: "function"` distinguishes it from other tool types (like code interpreter or file search).

**Why `undefined` instead of `[]` for no tools?** Passing `[]` might confuse some providers. The spread operator `...(tools ? { tools, tool_choice: "auto" } : {})` conditionally includes the `tools` field only when tools are available.

## API Call

```tsx
const completion = await this.client.chat.completions.create({
  model: this.model,
  messages,
  ...(tools ? { tools, tool_choice: "auto" } : {}),
});
```

**`tool_choice: "auto"`**: The model decides whether to call a tool or respond with text. This is the default and recommended setting — the model won't call a tool if it can answer directly.

## Response Parsing

### Extracting Tool Calls

```tsx
const toolCalls: LlmToolCall[] = (message?.tool_calls ?? [])
  .filter((tc) => tc.type === "function")
  .map((tc) => {
    const fn = (tc as { id: string; function: { name: string; arguments: string } }).function;
    return {
      id: tc.id,
      name: fn.name,
      input: JSON.parse(fn.arguments) as Record<string, unknown>,
    };
  });
```

**Why filter on `tc.type === "function"`?** The OpenAI API can theoretically return other tool call types. Filtering ensures only function calls are processed.

**Why `JSON.parse(fn.arguments)`?** The model returns tool arguments as a JSON string. The adapter parses it into a `Record<string, unknown>` for the tool registry, which validates it against the tool's schema.

**Why the type assertion `as { id: string; function: { ... } }`?** The OpenAI SDK type for `tool_calls` is a union type. The function-specific properties (`id`, `function.name`, `function.arguments`) aren't available on the base type without narrowing.

### Building the Response

```tsx
return {
  content: message?.content ?? "",
  toolCalls,
  provider: this.provider,
  metadata: {
    model: this.model,
    finishReason: choice?.finish_reason,
    usage: completion.usage,
  },
};
```

**`finishReason`**: Indicates why the model stopped — `"stop"` (natural end), `"tool_calls"` (it wants to call a tool), `"length"` (hit max tokens), or `"content_filter"` (blocked by safety filter).

**`usage`**: Token counts (`prompt_tokens`, `completion_tokens`, `total_tokens`). Useful for cost tracking in production.

## Error Handling

The adapter doesn't have explicit try/catch. Errors propagate to the chat route, which returns error responses to the client:

```tsx
// In the chat route:
const adapter = createLlmAdapter();  // throws if OPENROUTER_API_KEY missing
const response = await adapter.complete({ messages, tools, coreContext });
// If complete() throws (network error, rate limit, auth error),
// it bubbles up to the route handler's implicit error boundary
```

**Why no error wrapping in the adapter?** The adapter's job is to call the API and parse the response. Error handling (logging, user-facing messages, retry logic) belongs in the route handler. The adapter stays focused on the "happy path."

## Default Model

```tsx
const model = process.env.OPENROUTER_MODEL ?? "anthropic/claude-3-haiku";
```

**Why Claude 3 Haiku?** It offers:
- Low cost (one of the cheapest Claude models).
- Fast response times (sub-second for typical tool-calling).
- Good tool-calling accuracy.
- OpenRouter availability.

Production deployments can switch to `anthropic/claude-3-opus` or `openai/gpt-4o` by setting `OPENROUTER_MODEL`.

## Design Patterns

1. **All configuration via constructor**: No environment variable reads inside the class methods. The adapter receives `apiKey` and `model` in the constructor, making it testable — you can instantiate it with mock values.

2. **One-shot requests**: Each `complete()` call is independent. The adapter doesn't maintain conversation state between calls. The chat route manages the conversation history and passes the full message list each time.

3. **SDK reuse**: Uses the `openai` package rather than raw HTTP calls. This is pragmatic — it leverages battle-tested SDK features (streaming, retries, type-safe responses) without writing and maintaining those features.
