import { NextResponse } from "next/server";

import { getPrismaClient } from "@/db/client";
import { requireSession } from "@/lib/session";

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  const prisma = getPrismaClient();
  const pref = await prisma.notificationPreference.findUnique({
    where: { ownerUserId: session.userId },
    select: { inApp: true, telegram: true },
  });

  return NextResponse.json(pref ?? { inApp: true, telegram: true });
}

export async function PUT(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = (await request.json()) as { inApp?: boolean; telegram?: boolean };
  if (typeof body.inApp !== "boolean" && typeof body.telegram !== "boolean") {
    return NextResponse.json({ error: "inApp or telegram boolean required" }, { status: 400 });
  }

  const prisma = getPrismaClient();
  const pref = await prisma.notificationPreference.upsert({
    where: { ownerUserId: session.userId },
    create: {
      inApp: body.inApp ?? true,
      ownerUserId: session.userId,
      telegram: body.telegram ?? true,
      workspaceId: session.workspaceId,
    },
    update: {
      ...(body.inApp !== undefined && { inApp: body.inApp }),
      ...(body.telegram !== undefined && { telegram: body.telegram }),
    },
    select: { inApp: true, telegram: true },
  });

  return NextResponse.json(pref);
}
