import { NextResponse } from "next/server";

import { registerBoardTools } from "@/server/assistant/board-tools";
import { registerCanvasTools } from "@/server/assistant/canvas-tools";
import { createLlmAdapter, type LlmMessage } from "@/server/assistant/llm";
import { createToolRegistry } from "@/server/assistant/tools";
import { loadAssistantCoreContext } from "@/server/core-files";
import { requireSession } from "@/lib/session";

type IncomingMessage = { role: "user" | "assistant"; content: string };

export type ChatToolCall = {
  toolName: string;
  status: "success" | "error";
  summary: string;
  output?: unknown;
};

export async function POST(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = (await request.json()) as {
    messages?: IncomingMessage[];
    boardId?: string;
  };

  if (!body.messages?.length) {
    return NextResponse.json(
      { error: "messages is required." },
      { status: 400 },
    );
  }

  const registry = createToolRegistry();
  registerBoardTools(registry);
  registerCanvasTools(registry);

  const toolContext = {
    workspaceId: session.workspaceId,
    actor: { type: "user" as const, id: session.userId },
  };

  const toolDefs = registry.list();
  const llmToolDefs = toolDefs.map((t) => {
    const full = registry.get(t.name)!;
    return {
      name: full.name,
      description: full.description,
      inputSchema: {
        type: "object",
        additionalProperties: true,
      },
    };
  });

  const coreContext = await loadAssistantCoreContext();

  let boardContext = "";
  if (body.boardId) {
    boardContext = `\n\nCurrent board ID: ${body.boardId}. Use this boardId when adding canvas items.`;
  }

  const llmMessages: LlmMessage[] = body.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const adapter = createLlmAdapter();

  const firstResponse = await adapter.complete({
    messages: llmMessages,
    coreContext: coreContext
      ? coreContext + boardContext
      : boardContext || null,
    tools: llmToolDefs,
  });

  const executedToolCalls: ChatToolCall[] = [];

  if (firstResponse.toolCalls.length > 0) {
    const toolResultMessages: LlmMessage[] = [...llmMessages];

    if (firstResponse.content) {
      toolResultMessages.push({
        role: "assistant",
        content: firstResponse.content,
      });
    }

    for (const toolCall of firstResponse.toolCalls) {
      const result = await registry.execute(
        toolCall.name,
        toolCall.input,
        toolContext,
      );
      executedToolCalls.push({
        toolName: toolCall.name,
        status: result.ok ? "success" : "error",
        summary: result.summary,
        output: result.output,
      });

      toolResultMessages.push({
        role: "tool",
        content: JSON.stringify({ toolCallId: toolCall.id, result }),
      });
    }

    const finalResponse = await adapter.complete({
      messages: toolResultMessages,
      coreContext: null,
      tools: [],
    });

    return NextResponse.json({
      content: finalResponse.content,
      toolCalls: executedToolCalls,
    });
  }

  return NextResponse.json({
    content: firstResponse.content,
    toolCalls: executedToolCalls,
  });
}
