import { NextResponse } from "next/server";

import { getPrismaClient } from "@/db/client";
import { unlinkTelegramAccount } from "@/db/telegram";
import { requireSession } from "@/lib/session";

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  const prisma = getPrismaClient();
  const account = await prisma.telegramAccount.findFirst({
    where: { ownerUserId: session.userId, unlinkedAt: null },
    select: {
      telegramUserId: true,
      username: true,
      firstName: true,
      lastName: true,
      linkedAt: true,
    },
  });

  return NextResponse.json({ account });
}

export async function DELETE() {
  const { session, error } = await requireSession();
  if (error) return error;

  await unlinkTelegramAccount(session.userId);
  return NextResponse.json({ ok: true });
}
