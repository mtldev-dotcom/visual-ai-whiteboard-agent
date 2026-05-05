import type {
  CustomHtmlWidgetSource,
  Prisma,
  WidgetDefinition,
} from "@/generated/prisma/client";

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

export function getCustomHtmlWidgetDefinition(
  widgetDefinitionId: string,
): Promise<WidgetDefinition | null> {
  const prisma = getPrismaClient();

  return prisma.widgetDefinition.findFirst({
    where: {
      id: widgetDefinitionId,
      kind: "custom_html",
      sourceVersioned: true,
    },
  });
}

export function listCustomHtmlWidgetSources(
  widgetDefinitionId: string,
): Promise<CustomHtmlWidgetSource[]> {
  const prisma = getPrismaClient();

  return prisma.customHtmlWidgetSource.findMany({
    orderBy: { createdAt: "desc" },
    where: { widgetDefinitionId },
  });
}

export function getCustomHtmlWidgetSourceByVersion(
  widgetDefinitionId: string,
  version: string,
): Promise<CustomHtmlWidgetSource | null> {
  const prisma = getPrismaClient();

  return prisma.customHtmlWidgetSource.findUnique({
    where: {
      widgetDefinitionId_version: {
        version,
        widgetDefinitionId,
      },
    },
  });
}

export async function getNextCustomHtmlWidgetSourceVersion(
  widgetDefinitionId: string,
) {
  const sources = await listCustomHtmlWidgetSources(widgetDefinitionId);
  const highest = sources.reduce((max, source) => {
    const match = /^v(\d+)$/.exec(source.version);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);

  return `v${highest + 1}`;
}

export async function rollbackCustomHtmlWidgetSource(input: {
  widgetDefinitionId: string;
  sourceVersion: string;
  createdBy: "user" | "assistant" | "system" | "import";
}) {
  const source = await getCustomHtmlWidgetSourceByVersion(
    input.widgetDefinitionId,
    input.sourceVersion,
  );
  if (!source) return null;

  const nextVersion = await getNextCustomHtmlWidgetSourceVersion(
    input.widgetDefinitionId,
  );

  return storeCustomHtmlWidgetSource({
    createdBy: input.createdBy,
    css: source.css ?? undefined,
    html: source.html,
    js: source.js ?? undefined,
    riskLevel: source.riskLevel as "low" | "medium" | "high",
    version: nextVersion,
    widgetDefinitionId: input.widgetDefinitionId,
  });
}
