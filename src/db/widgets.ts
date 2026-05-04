import type { Prisma, WidgetDefinition } from "@/generated/prisma/client";

import { defaultCustomHtmlWidgetPermissions } from "../server/widgets/permissions";
import { getPrismaClient } from "./client";

export type CreateCustomHtmlWidgetDefinitionInput = {
  key: string;
  name: string;
  description: string;
  category: string;
  version: string;
  stateSchema?: Prisma.InputJsonObject;
};

export type StoreCustomHtmlWidgetSourceInput = {
  widgetDefinitionId: string;
  version: string;
  html: string;
  css?: string;
  js?: string;
  createdBy: "user" | "assistant" | "system" | "import";
  riskLevel?: "low" | "medium" | "high";
};

export function createCustomHtmlWidgetDefinition(
  input: CreateCustomHtmlWidgetDefinitionInput,
): Promise<WidgetDefinition> {
  const prisma = getPrismaClient();

  return prisma.widgetDefinition.create({
    data: {
      category: input.category,
      description: input.description,
      key: input.key,
      kind: "custom_html",
      name: input.name,
      permissions: defaultCustomHtmlWidgetPermissions,
      renderStrategy: "sandboxed_iframe",
      sourceVersioned: true,
      stateSchema: input.stateSchema ?? {},
      version: input.version,
    },
  });
}

export function storeCustomHtmlWidgetSource(
  input: StoreCustomHtmlWidgetSourceInput,
) {
  const prisma = getPrismaClient();

  return prisma.customHtmlWidgetSource.create({
    data: {
      createdBy: input.createdBy,
      css: input.css,
      html: input.html,
      js: input.js,
      riskLevel: input.riskLevel ?? "low",
      version: input.version,
      widgetDefinitionId: input.widgetDefinitionId,
    },
  });
}
