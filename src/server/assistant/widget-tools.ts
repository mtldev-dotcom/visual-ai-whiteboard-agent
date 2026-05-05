import { getBoardById } from "@/db/boards";
import {
  createCanvasItem,
  getCanvasItemById,
  updateCanvasItem,
} from "@/db/canvas-items";
import {
  createCustomHtmlWidgetDefinition,
  getCustomHtmlWidgetDefinition,
  listCustomHtmlWidgetSources,
  rollbackCustomHtmlWidgetSource,
  storeCustomHtmlWidgetSource,
} from "@/db/widgets";
import type { Prisma } from "@/generated/prisma/client";
import {
  buildSafeHtmlWidgetSource,
  slugifyWidgetKey,
} from "@/server/widgets/safe-html";

import type {
  ToolDefinition,
  ToolRegistry,
  ToolValidationResult,
} from "./tools";

type GenerateHtmlWidgetInput = {
  boardId: string;
  title: string;
  body: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

type RollbackHtmlWidgetInput = {
  itemId: string;
  sourceVersion: string;
};

function isObject(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function hasOptionalFiniteNumber(input: Record<string, unknown>, key: string) {
  return (
    input[key] === undefined ||
    (typeof input[key] === "number" && Number.isFinite(input[key]))
  );
}

export function validateGenerateHtmlWidgetInput(
  input: unknown,
): ToolValidationResult {
  if (!isObject(input)) return { ok: false, error: "Input must be an object." };
  if (typeof input.boardId !== "string" || !input.boardId.trim()) {
    return { ok: false, error: "boardId is required." };
  }
  if (typeof input.title !== "string" || !input.title.trim()) {
    return { ok: false, error: "title is required." };
  }
  if (typeof input.body !== "string" || !input.body.trim()) {
    return { ok: false, error: "body is required." };
  }
  for (const key of ["x", "y", "width", "height"]) {
    if (!hasOptionalFiniteNumber(input, key)) {
      return { ok: false, error: `${key} must be a finite number.` };
    }
  }
  return { ok: true };
}

export function validateRollbackHtmlWidgetInput(
  input: unknown,
): ToolValidationResult {
  if (!isObject(input)) return { ok: false, error: "Input must be an object." };
  if (typeof input.itemId !== "string" || !input.itemId.trim()) {
    return { ok: false, error: "itemId is required." };
  }
  if (typeof input.sourceVersion !== "string" || !input.sourceVersion.trim()) {
    return { ok: false, error: "sourceVersion is required." };
  }
  return { ok: true };
}

export const generateHtmlWidgetTool: ToolDefinition<GenerateHtmlWidgetInput> = {
  name: "generate_html_widget",
  description:
    "Generate a safe simple sandboxed HTML widget, store versioned source, and add it to the selected board.",
  permissionLevel: 4,
  validate: validateGenerateHtmlWidgetInput,
  execute: async (input, context) => {
    const board = await getBoardById(input.boardId);
    if (!board || board.workspaceId !== context.workspaceId) {
      return {
        ok: false,
        summary: "Board not found.",
        error: "Board not found.",
      };
    }

    const key = `generated-${context.workspaceId}-${slugifyWidgetKey(input.title)}-${Date.now()}`;
    const definition = await createCustomHtmlWidgetDefinition({
      category: "Generated",
      description: "Safe assistant-generated HTML widget",
      key,
      name: input.title.trim(),
      version: "v1",
    });
    const html = buildSafeHtmlWidgetSource({
      body: input.body,
      title: input.title,
    });
    const source = await storeCustomHtmlWidgetSource({
      createdBy: context.actor.type === "assistant" ? "assistant" : "user",
      html,
      riskLevel: "low",
      version: "v1",
      widgetDefinitionId: definition.id,
    });
    const content = {
      html: source.html,
      sourceVersion: source.version,
      sourceVersions: [source.version],
      title: input.title.trim(),
      widgetDefinitionId: definition.id,
    };
    const item = await createCanvasItem({
      boardId: board.id,
      content: content as Prisma.InputJsonObject,
      createdBy: context.actor.type === "assistant" ? "assistant" : "user",
      height: input.height ?? 260,
      safetyMetadata: {
        permissions: [],
        requiresConfirmation: true,
        riskLevel: "low",
      },
      type: "html_widget",
      width: input.width ?? 360,
      workspaceId: context.workspaceId,
      x: input.x ?? 80,
      y: input.y ?? 80,
    });

    return {
      ok: true,
      output: {
        itemId: item.id,
        sourceVersion: source.version,
        widgetDefinitionId: definition.id,
      },
      summary: "Generated a safe sandboxed HTML widget.",
    };
  },
};

export const rollbackHtmlWidgetTool: ToolDefinition<RollbackHtmlWidgetInput> = {
  name: "rollback_html_widget",
  description:
    "Rollback a generated HTML widget canvas item to a previous source version by creating a new source version from it.",
  permissionLevel: 4,
  validate: validateRollbackHtmlWidgetInput,
  execute: async (input, context) => {
    const item = await getCanvasItemById(input.itemId);
    if (
      !item ||
      item.workspaceId !== context.workspaceId ||
      item.type !== "html_widget"
    ) {
      return {
        ok: false,
        summary: "HTML widget not found.",
        error: "HTML widget not found.",
      };
    }
    const content = isObject(item.content) ? item.content : {};
    const widgetDefinitionId = content.widgetDefinitionId;
    if (typeof widgetDefinitionId !== "string") {
      return {
        ok: false,
        summary: "Widget source history not found.",
        error: "Widget source history not found.",
      };
    }
    const definition = await getCustomHtmlWidgetDefinition(widgetDefinitionId);
    if (!definition) {
      return {
        ok: false,
        summary: "Widget definition not found.",
        error: "Widget definition not found.",
      };
    }
    const rolledBack = await rollbackCustomHtmlWidgetSource({
      createdBy: context.actor.type === "assistant" ? "assistant" : "user",
      sourceVersion: input.sourceVersion,
      widgetDefinitionId,
    });
    if (!rolledBack) {
      return {
        ok: false,
        summary: "Requested source version not found.",
        error: "Requested source version not found.",
      };
    }
    const sources = await listCustomHtmlWidgetSources(widgetDefinitionId);
    const updatedContent = {
      ...content,
      html: rolledBack.html,
      sourceVersion: rolledBack.version,
      sourceVersions: sources
        .map((source) => source.version)
        .concat(rolledBack.version)
        .filter((version, index, all) => all.indexOf(version) === index),
    };
    await updateCanvasItem({
      content: updatedContent as Prisma.InputJsonObject,
      itemId: item.id,
    });

    return {
      ok: true,
      output: {
        itemId: item.id,
        restoredFromVersion: input.sourceVersion,
        sourceVersion: rolledBack.version,
        widgetDefinitionId,
      },
      summary: `Rolled back HTML widget to ${input.sourceVersion} as ${rolledBack.version}.`,
    };
  },
};

export function registerWidgetTools(registry: ToolRegistry) {
  registry.register(generateHtmlWidgetTool);
  registry.register(rollbackHtmlWidgetTool);
}
