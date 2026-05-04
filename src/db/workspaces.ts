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

export async function getOrCreateWorkspaceForUser(
  ownerUserId: string,
  displayName: string,
): Promise<Workspace> {
  const prisma = getPrismaClient();

  const existing = await prisma.workspace.findFirst({
    where: { ownerUserId },
    orderBy: { createdAt: "asc" },
  });

  if (existing) return existing;

  return prisma.workspace.create({
    data: {
      ownerUserId,
      name: `${displayName}'s Workspace`,
    },
  });
}
