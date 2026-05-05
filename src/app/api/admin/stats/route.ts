import { NextResponse } from "next/server";

import { getPrismaClient } from "@/db/client";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  const { admin, error } = await requireAdmin();
  if (error) return error;
  void admin;

  const prisma = getPrismaClient();
  const [users, apiKeys, boards, auditEvents, workspaces] = await Promise.all([
    prisma.user.count(),
    prisma.apiKey.count({ where: { revokedAt: null } }),
    prisma.board.count({ where: { archivedAt: null } }),
    prisma.auditEvent.count(),
    prisma.workspace.count(),
  ]);

  return NextResponse.json({ users, apiKeys, boards, auditEvents, workspaces });
}
