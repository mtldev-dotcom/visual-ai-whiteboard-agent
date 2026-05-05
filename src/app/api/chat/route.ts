import { NextResponse } from "next/server";

import { appendMessages } from "@/db/chat";
import { registerBoardManagementTools } from "@/server/assistant/board-management-tools";
import { registerBoardTools } from "@/server/assistant/board-tools";
import { registerBoardQueryTools } from "@/server/assistant/board-query-tools";
import { registerCanvasTools } from "@/server/assistant/canvas-tools";
import { registerTaskTools } from "@/server/assistant/task-tools";
import { registerWidgetTools } from "@/server/assistant/widget-tools";
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

const BOARD_ID_TOOLS = new Set([
  "add_canvas_item",
  "summarize_board",
  "list_canvas_items",
  "generate_html_widget",
  "organize_board",
  "duplicate_board",
  "update_memory",
]);
const MAX_TOOL_ROUNDS = 4;

export async function POST(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = (await request.json()) as {
    messages?: IncomingMessage[];
    boardId?: string;
    threadId?: string;
  };

  if (!body.messages?.length) {
    return NextResponse.json(
      { error: "messages is required." },
      { status: 400 },
    );
  }

  const registry = createToolRegistry();
  registerBoardTools(registry);
  registerBoardQueryTools(registry);
  registerCanvasTools(registry);
  registerTaskTools(registry);
  registerWidgetTools(registry);
  registerBoardManagementTools(registry);

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
      inputSchema: getToolInputSchema(full.name),
    };
  });

  const coreContext = await loadAssistantCoreContext();

  const runtimeContext = buildRuntimeContext(body.boardId);
  let boardContext = runtimeContext;
  if (body.boardId) {
    boardContext += `\n\nCurrent board ID: ${body.boardId}. Use this exact boardId for board and canvas tools.`;
  }

  const llmMessages: LlmMessage[] = body.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const adapter = createLlmAdapter();

  const executedToolCalls: ChatToolCall[] = [];
  const toolResultMessages: LlmMessage[] = [...llmMessages];
  let assistantContent: string | null = null;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await adapter.complete({
      messages: toolResultMessages,
      coreContext:
        round === 0
          ? coreContext
            ? coreContext + boardContext
            : boardContext || null
          : buildToolFollowupContext(),
      tools: llmToolDefs,
    });

    assistantContent = response.content;

    if (response.toolCalls.length === 0) {
      break;
    }

    if (response.content) {
      toolResultMessages.push({
        role: "assistant",
        content: response.content,
      });
    }

    for (const toolCall of response.toolCalls) {
      const normalizedInput = normalizeToolInput(
        toolCall.name,
        toolCall.input,
        {
          boardId: body.boardId,
        },
      );
      const result = await registry.execute(
        toolCall.name,
        normalizedInput,
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
        content: JSON.stringify({
          toolCallId: toolCall.id,
          toolName: toolCall.name,
          input: normalizedInput,
          result,
        }),
      });
    }
  }

  if (executedToolCalls.length > 0) {
    const finalResponse = await adapter.complete({
      messages: toolResultMessages,
      coreContext: buildFinalResponseContext(),
      tools: [],
    });

    assistantContent = finalResponse.content;

    await persistTurn(
      body.threadId,
      body.messages,
      executedToolCalls,
      finalResponse.content,
    );

    return NextResponse.json({
      content: assistantContent,
      toolCalls: executedToolCalls,
    });
  }

  await persistTurn(
    body.threadId,
    body.messages,
    executedToolCalls,
    assistantContent,
  );

  return NextResponse.json({
    content: assistantContent,
    toolCalls: executedToolCalls,
  });
}

function buildRuntimeContext(boardId: string | undefined) {
  const now = new Date();
  return [
    `Current date/time: ${now.toISOString()}.`,
    "Assume the user's local timezone is America/Toronto unless they say otherwise.",
    "For relative reminder phrases like 'tomorrow', 'tmr', or 'next Friday', convert them to an ISO 8601 remindAt before calling create_reminder.",
    "When the user asks what is on the board, what you can see, to summarize the board, or to find/update/delete an existing item, call summarize_board or list_canvas_items before answering.",
    "When the user asks to delete or update an existing item and you need the item ID, first call list_canvas_items, then call delete_canvas_item or update_canvas_item in a follow-up tool call. Do not claim the change happened until the write tool succeeds.",
    "For safe simple generated widgets, call generate_html_widget. Generated widgets must remain sandboxed and require user confirmation before running.",
    "To rearrange or tidy items on a board, call organize_board with an optional strategy (grid, rows, or columns).",
    "To copy a board and all its items, call duplicate_board. A new board is created; the original is not modified.",
    "To undo a recent item deletion, call rollback_canvas_change with the itemId from the previous delete_canvas_item result.",
    "To save a board summary into long-term memory, call update_memory with the boardId and an optional note. This appends a timestamped entry to MEMORY.md.",
    "Board and item tool results are authoritative. Never invent item titles, item counts, board names, or content.",
    "If no board is selected, ask the user to select or create a board before making board changes.",
    boardId
      ? "A board is selected. Prefer using the selected board for board-specific commands unless the user clearly names another board."
      : "No board is selected.",
  ].join("\n");
}

function buildToolFollowupContext() {
  return [
    "You are continuing after one or more tool calls.",
    "If the user requested a board mutation and the previous tool result only identified candidate items, call the needed write tool now.",
    "For delete requests, call delete_canvas_item with confirmed=true after identifying the target item.",
    "For update requests, call update_canvas_item after identifying the target item.",
    "Do not produce a final success message for a mutation unless the mutation tool has succeeded.",
  ].join("\n");
}

function buildFinalResponseContext() {
  return [
    "You are writing the final response after tool execution.",
    "Use tool result data as authoritative.",
    "For board summaries, mention the actual item count, item types, titles, and visible content from the tool result.",
    "Do not mention items or content that are not present in the tool result.",
    "If the user asked to delete, update, create, generate, rollback, or remember something, only say it was done if the corresponding delete_canvas_item, update_canvas_item, add_canvas_item, create_task, create_reminder, create_board, create_sub_board, generate_html_widget, rollback_html_widget, organize_board, duplicate_board, rollback_canvas_change, update_memory tool succeeded.",
    "If only list_canvas_items or summarize_board ran, say what you found and what still needs to happen; do not claim a mutation happened.",
    "If a tool failed, explain the failure and what the user can do next.",
  ].join("\n");
}

function normalizeToolInput(
  toolName: string,
  input: Record<string, unknown>,
  context: { boardId?: string },
) {
  const normalized = { ...input };

  if (
    context.boardId &&
    BOARD_ID_TOOLS.has(toolName) &&
    typeof normalized.boardId !== "string"
  ) {
    normalized.boardId = context.boardId;
  }

  if (
    context.boardId &&
    (toolName === "create_task" || toolName === "create_reminder") &&
    normalized.boardId === undefined
  ) {
    normalized.boardId = context.boardId;
  }

  return normalized;
}

function getToolInputSchema(toolName: string): Record<string, unknown> {
  const objectBase = { type: "object", additionalProperties: false };

  switch (toolName) {
    case "create_board":
      return {
        ...objectBase,
        required: ["title"],
        properties: {
          title: { type: "string" },
          description: { type: "string" },
        },
      };
    case "create_sub_board":
      return {
        ...objectBase,
        required: ["parentBoardId", "title"],
        properties: {
          parentBoardId: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
        },
      };
    case "add_canvas_item":
      return {
        ...objectBase,
        required: ["boardId", "type", "x", "y", "width", "height", "content"],
        properties: {
          boardId: { type: "string" },
          type: {
            type: "string",
            enum: [
              "text",
              "sticky_note",
              "task_list",
              "kanban",
              "rich_text",
              "reminders",
              "markdown",
              "image",
              "link",
              "board_link",
              "html_widget",
              "drawing",
              "arrow",
              "shape",
              "frame",
            ],
          },
          x: { type: "number" },
          y: { type: "number" },
          width: { type: "number" },
          height: { type: "number" },
          content: { type: "object", additionalProperties: true },
          style: { type: "object", additionalProperties: true },
          metadata: { type: "object", additionalProperties: true },
          safetyMetadata: { type: "object", additionalProperties: true },
        },
      };
    case "update_canvas_item":
      return {
        ...objectBase,
        required: ["itemId"],
        properties: {
          itemId: { type: "string" },
          x: { type: "number" },
          y: { type: "number" },
          width: { type: "number" },
          height: { type: "number" },
          content: { type: "object", additionalProperties: true },
          style: { type: "object", additionalProperties: true },
          metadata: { type: "object", additionalProperties: true },
          safetyMetadata: { type: "object", additionalProperties: true },
        },
      };
    case "delete_canvas_item":
      return {
        ...objectBase,
        required: ["itemId", "confirmed"],
        properties: {
          itemId: { type: "string" },
          confirmed: { type: "boolean", enum: [true] },
        },
      };
    case "summarize_board":
    case "list_canvas_items":
      return {
        ...objectBase,
        required: ["boardId"],
        properties: {
          boardId: { type: "string" },
        },
      };
    case "create_task":
      return {
        ...objectBase,
        required: ["title"],
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          priority: { type: "string", enum: ["low", "normal", "high"] },
          boardId: { type: "string" },
          dueAt: { type: "string", description: "ISO 8601 date string" },
        },
      };
    case "create_reminder":
      return {
        ...objectBase,
        required: ["title", "remindAt"],
        properties: {
          title: { type: "string" },
          remindAt: { type: "string", description: "ISO 8601 date string" },
          boardId: { type: "string" },
        },
      };
    case "list_tasks":
    case "list_reminders":
      return {
        ...objectBase,
        properties: {},
      };
    case "generate_html_widget":
      return {
        ...objectBase,
        required: ["boardId", "title", "body"],
        properties: {
          boardId: { type: "string" },
          title: { type: "string" },
          body: { type: "string" },
          x: { type: "number" },
          y: { type: "number" },
          width: { type: "number" },
          height: { type: "number" },
        },
      };
    case "rollback_html_widget":
      return {
        ...objectBase,
        required: ["itemId", "sourceVersion"],
        properties: {
          itemId: { type: "string" },
          sourceVersion: { type: "string" },
        },
      };
    case "organize_board":
      return {
        ...objectBase,
        required: ["boardId"],
        properties: {
          boardId: { type: "string" },
          strategy: { type: "string", enum: ["grid", "rows", "columns"] },
        },
      };
    case "duplicate_board":
      return {
        ...objectBase,
        required: ["boardId"],
        properties: {
          boardId: { type: "string" },
          title: { type: "string" },
        },
      };
    case "rollback_canvas_change":
      return {
        ...objectBase,
        required: ["itemId", "confirmed"],
        properties: {
          itemId: { type: "string" },
          confirmed: { type: "boolean", enum: [true] },
        },
      };
    case "update_memory":
      return {
        ...objectBase,
        required: ["boardId"],
        properties: {
          boardId: { type: "string" },
          note: { type: "string" },
        },
      };
    default:
      return { type: "object", additionalProperties: true };
  }
}

async function persistTurn(
  threadId: string | undefined,
  incomingMessages: IncomingMessage[] | undefined,
  toolCalls: ChatToolCall[],
  assistantContent: string | null,
) {
  if (!threadId || !incomingMessages?.length) return;
  const lastUser = incomingMessages[incomingMessages.length - 1];
  const toSave: Parameters<typeof appendMessages>[1] = [];
  if (lastUser.role === "user") {
    toSave.push({ role: "user", content: lastUser.content });
  }
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
