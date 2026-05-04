import OpenAI from "openai";

import { loadAssistantCoreContext } from "@/server/core-files";

export type LlmRole = "system" | "user" | "assistant" | "tool";

export type LlmMessage = {
  role: LlmRole;
  content: string;
};

export type LlmToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export type LlmRequest = {
  messages: LlmMessage[];
  coreContext?: string | null;
  tools?: LlmToolDefinition[];
};

export type LlmToolCall = {
  id: string;
  name: string;
  input: Record<string, unknown>;
};

export type LlmResponse = {
  content: string;
  metadata?: Record<string, unknown>;
  toolCalls: LlmToolCall[];
  provider: string;
};

export type LlmAdapter = {
  provider: string;
  complete(request: LlmRequest): Promise<LlmResponse>;
};

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

  async complete(request: LlmRequest): Promise<LlmResponse> {
    const coreContext =
      request.coreContext === undefined
        ? await loadAssistantCoreContext()
        : request.coreContext;

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    if (coreContext) {
      messages.push({ role: "system", content: coreContext });
    }

    for (const m of request.messages) {
      if (m.role === "system" || m.role === "user" || m.role === "assistant") {
        messages.push({ role: m.role, content: m.content });
      }
    }

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

    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages,
      ...(tools ? { tools, tool_choice: "auto" } : {}),
    });

    const choice = completion.choices[0];
    const message = choice?.message;

    const toolCalls: LlmToolCall[] = (message?.tool_calls ?? [])
      .filter((tc) => tc.type === "function")
      .map((tc) => {
        const fn = (
          tc as { id: string; function: { name: string; arguments: string } }
        ).function;
        return {
          id: tc.id,
          name: fn.name,
          input: JSON.parse(fn.arguments) as Record<string, unknown>,
        };
      });

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
  }
}

export function createLlmAdapter(
  provider = process.env.LLM_PROVIDER,
): LlmAdapter {
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
