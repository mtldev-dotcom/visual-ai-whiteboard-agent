import type { Workspace } from "@/generated/prisma/client";

import { getPrismaClient } from "./client";

export type CreateWorkspaceInput = {
  ownerUserId: string;
  name: string;
};

export function createWorkspace(
  input: CreateWorkspaceInput,
): Promise<Workspace> {
  const prisma = getPrismaClient();

  return prisma.workspace.create({
    data: {
      ownerUserId: input.ownerUserId,
      name: input.name,
    },
  });
}

export function listWorkspacesForOwner(
  ownerUserId: string,
): Promise<Workspace[]> {
  const prisma = getPrismaClient();

  return prisma.workspace.findMany({
    where: { ownerUserId },
    orderBy: { updatedAt: "desc" },
  });
}
