import { NextResponse } from "next/server";

import { consumeTelegramLinkToken } from "@/db/telegram";
import {
  handleTelegramTextCommand,
  parseCommandArgument,
  parseTelegramCommand,
} from "@/server/telegram/commands";

type TelegramUpdate = {
  message?: TelegramMessage;
};

type TelegramMessage = {
  chat?: { id?: number | string };
  from?: {
    first_name?: string;
    id?: number | string;
    last_name?: string;
    username?: string;
  };
  text?: string;
};

export async function POST(request: Request) {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const receivedSecret = request.headers.get("x-telegram-bot-api-secret-token");

  if (expectedSecret && receivedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json(
      { error: "Telegram bot is not configured." },
      { status: 503 },
    );
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

  const replyText = await getTelegramReplyText({
    message,
    telegramUserId: String(telegramUserId),
    text,
  });
  await sendTelegramMessage({
    botToken,
    chatId: String(chatId),
    text: replyText,
  });

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true });
}

async function getTelegramReplyText(input: {
  message: TelegramMessage;
  telegramUserId: string;
  text: string;
}) {
  const command = parseTelegramCommand(input.text);

  if (command === "/start") {
    const token = parseCommandArgument(input.text);

    if (!token) {
      return "Open the web app to link your Telegram account.";
    }

    const result = await consumeTelegramLinkToken({
      sender: {
        firstName: input.message.from?.first_name,
        lastName: input.message.from?.last_name,
        telegramUserId: input.telegramUserId,
        username: input.message.from?.username,
      },
      token,
    });

    return result.ok
      ? "Telegram is linked. Try /boards or /tasks."
      : result.error;
  }

  const reply = await handleTelegramTextCommand({
    telegramUserId: input.telegramUserId,
    text: input.text,
  });

  return reply.text;
}

async function sendTelegramMessage(input: {
  botToken: string;
  chatId: string;
  text: string;
}) {
  const response = await fetch(
    `https://api.telegram.org/bot${input.botToken}/sendMessage`,
    {
      body: JSON.stringify({
        chat_id: input.chatId,
        disable_web_page_preview: true,
        text: input.text,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
  );

  if (!response.ok) {
    throw new Error("Telegram sendMessage failed.");
  }
}
