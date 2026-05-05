import { NextResponse } from "next/server";

import { registerBoardManagementTools } from "@/server/assistant/board-management-tools";
import { registerBoardQueryTools } from "@/server/assistant/board-query-tools";
import { registerBoardTools } from "@/server/assistant/board-tools";
import { registerCanvasTools } from "@/server/assistant/canvas-tools";
import { registerTaskTools } from "@/server/assistant/task-tools";
import { registerWidgetTools } from "@/server/assistant/widget-tools";
import { createLlmAdapter, type LlmMessage } from "@/server/assistant/llm";
import { createToolRegistry } from "@/server/assistant/tools";
import { loadAssistantCoreContext } from "@/server/core-files";
import { requireAdmin } from "@/lib/admin";

const MAX_TOOL_ROUNDS = 4;

export async function POST(request: Request) {
  const { admin, error } = await requireAdmin();
  if (error) return error;

  const body = (await request.json()) as {
    message?: string;
    boardId?: string;
    workspaceId?: string;
  };

  if (!body.message) {
    return NextResponse.json({ error: "message is required." }, { status: 400 });
  }

  const workspaceId = body.workspaceId ?? admin!.workspaceId;

  const registry = createToolRegistry();
  registerBoardTools(registry);
  registerBoardQueryTools(registry);
  registerCanvasTools(registry);
  registerTaskTools(registry);
  registerWidgetTools(registry);
  registerBoardManagementTools(registry);

  const toolContext = {
    workspaceId,
    actor: { type: "user" as const, id: admin!.userId },
  };

  const toolDefs = registry.list().map((t) => {
    const full = registry.get(t.name)!;
    return { name: full.name, description: full.description, inputSchema: {} };
  });

  const coreContext = await loadAssistantCoreContext();
  const runtimeContext = `Current date/time: ${new Date().toISOString()}.`;
  const systemPrompt = coreContext
    ? coreContext + "\n\n" + runtimeContext
    : runtimeContext;

  const messages: LlmMessage[] = [{ role: "user", content: body.message }];
  const adapter = createLlmAdapter();

  const trace: {
    round: number;
    request: { messages: LlmMessage[]; systemPromptLength: number };
    response: { content: string | null; toolCalls: unknown[] };
    toolResults: unknown[];
  }[] = [];

  const toolResultMessages: LlmMessage[] = [...messages];
  let assistantContent: string | null = null;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const roundRequest = {
      messages: [...toolResultMessages],
      systemPromptLength: systemPrompt.length,
    };

    const response = await adapter.complete({
      messages: toolResultMessages,
      coreContext: round === 0 ? systemPrompt : null,
      tools: toolDefs,
    });

    assistantContent = response.content;
    const roundToolResults: unknown[] = [];

    if (response.toolCalls.length === 0) {
      trace.push({ round, request: roundRequest, response: { content: response.content, toolCalls: [] }, toolResults: [] });
      break;
    }

    if (response.content) {
      toolResultMessages.push({ role: "assistant", content: response.content });
    }

    for (const toolCall of response.toolCalls) {
      const input = { ...(toolCall.input ?? {}), ...(body.boardId ? { boardId: body.boardId } : {}) };
      const result = await registry.execute(toolCall.name, input, toolContext);
      roundToolResults.push({ toolName: toolCall.name, input, result });
      toolResultMessages.push({
        role: "tool",
        content: JSON.stringify({ toolCallId: toolCall.id, toolName: toolCall.name, input, result }),
      });
    }

    trace.push({
      round,
      request: roundRequest,
      response: { content: response.content, toolCalls: response.toolCalls },
      toolResults: roundToolResults,
    });
  }

  return NextResponse.json({
    content: assistantContent,
    systemPromptLength: systemPrompt.length,
    systemPromptPreview: systemPrompt.slice(0, 500) + (systemPrompt.length > 500 ? "..." : ""),
    trace,
  });
}
