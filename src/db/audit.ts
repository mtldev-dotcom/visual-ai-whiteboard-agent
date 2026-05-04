import type { AuditEvent, Prisma } from "@/generated/prisma/client";

import { getPrismaClient } from "./client";

export type RecordAuditEventInput = {
  workspaceId: string;
  actorType: "user" | "assistant" | "system" | "telegram";
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  summary: string;
  metadata?: Prisma.InputJsonValue;
};

export function recordAuditEvent(
  input: RecordAuditEventInput,
): Promise<AuditEvent> {
  const prisma = getPrismaClient();

  return prisma.auditEvent.create({
    data: {
      action: input.action,
      actorId: input.actorId,
      actorType: input.actorType,
      metadata: input.metadata ?? {},
      summary: input.summary,
      targetId: input.targetId,
      targetType: input.targetType,
      workspaceId: input.workspaceId,
    },
  });
}
