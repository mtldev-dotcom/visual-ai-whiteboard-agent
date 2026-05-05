import { NextResponse } from "next/server";

import { getPrismaClient } from "@/db/client";
import {
  getActiveTelegramBotConnectionForOwner,
  linkTelegramAccountFromStart,
  unlinkTelegramAccount,
} from "@/db/telegram";
import { requireSession } from "@/lib/session";

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  const prisma = getPrismaClient();
  const [account, bot] = await Promise.all([
    prisma.telegramAccount.findFirst({
      where: { ownerUserId: session.userId, unlinkedAt: null },
      select: {
        firstName: true,
        lastName: true,
        linkedAt: true,
        telegramChatId: true,
        telegramUserId: true,
        username: true,
      },
    }),
    getActiveTelegramBotConnectionForOwner(session.userId),
  ]);

  return NextResponse.json({ account, bot });
}

export async function POST(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = (await request.json().catch(() => null)) as {
    telegramUserId?: unknown;
  } | null;
  const telegramUserId =
    typeof body?.telegramUserId === "string" ? body.telegramUserId.trim() : "";

  if (!/^\d+$/.test(telegramUserId)) {
    return NextResponse.json(
      { error: "Telegram ID must contain only digits." },
      { status: 400 },
    );
  }

  const bot = await getActiveTelegramBotConnectionForOwner(session.userId);

  if (!bot) {
    return NextResponse.json(
      { error: "Connect a Telegram bot token first." },
      { status: 400 },
    );
  }

  const result = await linkTelegramAccountFromStart({
    botConnectionId: bot.id,
    ownerUserId: session.userId,
    telegramUserId,
    workspaceId: session.workspaceId,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    account: {
      firstName: result.account.firstName,
      lastName: result.account.lastName,
      linkedAt: result.account.linkedAt.toISOString(),
      telegramChatId: result.account.telegramChatId,
      telegramUserId: result.account.telegramUserId,
      username: result.account.username,
    },
  });
}

export async function DELETE() {
  const { session, error } = await requireSession();
  if (error) return error;

  await unlinkTelegramAccount(session.userId);
  return NextResponse.json({ ok: true });
}
