import { randomUUID } from "crypto";

import { NextResponse } from "next/server";

import {
  getActiveTelegramBotConnectionForOwner,
  getTelegramBotConnectionTokenForOwner,
  revokeTelegramBotConnection,
  upsertTelegramBotConnection,
} from "@/db/telegram";
import { requireSession } from "@/lib/session";
import {
  deleteTelegramWebhook,
  getTelegramBotProfile,
  registerTelegramWebhook,
} from "@/server/telegram/bot-api";
import {
  createTelegramWebhookSecret,
  decryptSecret,
  encryptSecret,
} from "@/server/telegram/credentials";

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  const bot = await getActiveTelegramBotConnectionForOwner(session.userId);

  return NextResponse.json({ bot });
}

export async function POST(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = (await request.json().catch(() => null)) as {
    token?: unknown;
  } | null;
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  const appUrl = process.env.APP_URL ?? process.env.NEXTAUTH_URL;

  if (!token) {
    return NextResponse.json(
      { error: "Telegram bot token is required." },
      { status: 400 },
    );
  }

  if (!appUrl) {
    return NextResponse.json(
      { error: "APP_URL is required before connecting Telegram." },
      { status: 500 },
    );
  }

  try {
    const profile = await getTelegramBotProfile(token);
    const webhookSecret = createTelegramWebhookSecret();
    const existing = await getActiveTelegramBotConnectionForOwner(
      session.userId,
    );
    const connectionId = existing?.id ?? randomUUID();
    const encryptedToken = encryptSecret(token);

    await registerTelegramWebhook({
      appUrl,
      botToken: token,
      connectionId,
      webhookSecret,
    });

    const bot = await upsertTelegramBotConnection({
      botFirstName: profile.firstName,
      botId: profile.id,
      botUsername: profile.username,
      encryptedToken,
      id: connectionId,
      ownerUserId: session.userId,
      token,
      webhookSecret,
      workspaceId: session.workspaceId,
    });

    return NextResponse.json({ bot });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not connect Telegram bot.";
    const status = message.includes("APP_ENCRYPTION_KEY") ? 500 : 400;

    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE() {
  const { session, error } = await requireSession();
  if (error) return error;

  const existing = await getTelegramBotConnectionTokenForOwner(session.userId);
  const revoked = await revokeTelegramBotConnection(session.userId);

  if (existing) {
    try {
      const token = decryptSecret({
        authTag: existing.tokenAuthTag,
        ciphertext: existing.tokenCiphertext,
        iv: existing.tokenIv,
      });
      await deleteTelegramWebhook(token).catch(() => null);
    } catch {
      // Local revocation should still succeed if credentials are unavailable.
    }
  }

  return NextResponse.json({ ok: true, bot: revoked });
}
