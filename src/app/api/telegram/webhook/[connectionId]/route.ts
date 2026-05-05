import { NextResponse } from "next/server";

import {
  getTelegramBotConnectionById,
  recordTelegramStartIdentity,
} from "@/db/telegram";
import { sendTelegramMessage } from "@/server/telegram/bot-api";
import {
  handleTelegramTextCommand,
  parseTelegramCommand,
} from "@/server/telegram/commands";
import { decryptSecret, verifySecretHash } from "@/server/telegram/credentials";

type TelegramUpdate = {
  message?: TelegramMessage;
};

type TelegramMessage = {
  chat?: { id?: number | string; type?: string };
  from?: {
    first_name?: string;
    id?: number | string;
    last_name?: string;
    username?: string;
  };
  text?: string;
};

type RouteContext = {
  params: Promise<{ connectionId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { connectionId } = await context.params;
  const connection = await getTelegramBotConnectionById(connectionId);

  if (!connection) {
    return NextResponse.json(
      { error: "Telegram bot not found." },
      { status: 404 },
    );
  }

  const receivedSecret = request.headers.get("x-telegram-bot-api-secret-token");

  if (
    !receivedSecret ||
    !verifySecretHash(receivedSecret, connection.webhookSecretHash)
  ) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const update = (await request.json()) as TelegramUpdate;
  const message = update.message;
  const text = message?.text?.trim();
  const chatId = message?.chat?.id;
  const telegramUserId = message?.from?.id;

  if (
    !message ||
    !text ||
    chatId === undefined ||
    telegramUserId === undefined
  ) {
    return NextResponse.json({ ok: true });
  }

  const botToken = decryptSecret({
    authTag: connection.tokenAuthTag,
    ciphertext: connection.tokenCiphertext,
    iv: connection.tokenIv,
  });
  const replyText = await getTelegramReplyText({
    botConnectionId: connection.id,
    chatId: String(chatId),
    message,
    telegramUserId: String(telegramUserId),
    text,
    workspaceId: connection.workspaceId,
  });

  await sendTelegramMessage({
    botToken,
    chatId: String(chatId),
    text: replyText,
  });

  return NextResponse.json({ ok: true });
}

async function getTelegramReplyText(input: {
  botConnectionId: string;
  chatId: string;
  message: TelegramMessage;
  telegramUserId: string;
  text: string;
  workspaceId: string;
}) {
  if (input.message.chat?.type && input.message.chat.type !== "private") {
    return "Open a private chat with this bot to connect or use workspace commands.";
  }

  const command = parseTelegramCommand(input.text);

  if (command === "/start") {
    await recordTelegramStartIdentity({
      botConnectionId: input.botConnectionId,
      chatId: input.chatId,
      firstName: input.message.from?.first_name,
      lastName: input.message.from?.last_name,
      telegramUserId: input.telegramUserId,
      username: input.message.from?.username,
      workspaceId: input.workspaceId,
    });

    return `Your Telegram ID is ${input.telegramUserId}. Paste this ID in Settings and click Connect ID.`;
  }

  const reply = await handleTelegramTextCommand({
    botConnectionId: input.botConnectionId,
    telegramUserId: input.telegramUserId,
    text: input.text,
  });

  return reply.text;
}
