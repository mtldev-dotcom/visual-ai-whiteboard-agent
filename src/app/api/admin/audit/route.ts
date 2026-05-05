import { NextResponse } from "next/server";

import { getPrismaClient } from "@/db/client";
import { requireAdmin } from "@/lib/admin";

export async function GET(request: Request) {
  const { admin, error } = await requireAdmin();
  if (error) return error;
  void admin;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = 50;
  const skip = (page - 1) * limit;
  const actorType = searchParams.get("actorType") ?? undefined;
  const action = searchParams.get("action") ?? undefined;

  const prisma = getPrismaClient();
  const where = {
    ...(actorType ? { actorType } : {}),
    ...(action ? { action } : {}),
  };

  const [events, total] = await Promise.all([
    prisma.auditEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: { workspace: { select: { name: true } } },
    }),
    prisma.auditEvent.count({ where }),
  ]);

  return NextResponse.json({ events, total, page, pages: Math.ceil(total / limit) });
}
