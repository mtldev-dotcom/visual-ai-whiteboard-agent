import { NextResponse } from "next/server";

import { getPrismaClient } from "@/db/client";
import { requireAdmin } from "@/lib/admin";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { admin, error } = await requireAdmin();
  if (error) return error;
  void admin;

  const { id } = await params;
  const prisma = getPrismaClient();

  await prisma.apiKey.update({
    where: { id },
    data: { revokedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
