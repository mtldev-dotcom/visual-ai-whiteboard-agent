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

export function createLlmAdapter(
  provider = process.env.LLM_PROVIDER,
): LlmAdapter {
  if (!provider || provider === "local") {
    return new LocalLlmAdapter();
  }

  throw new Error(`Unsupported LLM provider: ${provider}`);
}
