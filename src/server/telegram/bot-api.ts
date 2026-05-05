export type TelegramFetch = typeof fetch;

export type TelegramBotProfile = {
  id: string;
  username: string | null;
  firstName: string | null;
};

type TelegramApiResponse<T> = {
  ok?: boolean;
  description?: string;
  result?: T;
};

type TelegramGetMeResult = {
  first_name?: string;
  id: number | string;
  is_bot?: boolean;
  username?: string;
};

export function isPlausibleTelegramBotToken(token: string): boolean {
  return /^\d{5,}:[A-Za-z0-9_-]{20,}$/.test(token.trim());
}

export async function getTelegramBotProfile(
  token: string,
  fetchImpl: TelegramFetch = fetch,
): Promise<TelegramBotProfile> {
  const normalizedToken = token.trim();

  if (!isPlausibleTelegramBotToken(normalizedToken)) {
    throw new Error("Invalid Telegram bot token format.");
  }

  const response = await fetchImpl(
    `https://api.telegram.org/bot${normalizedToken}/getMe`,
    { method: "POST" },
  );
  const data =
    (await response.json()) as TelegramApiResponse<TelegramGetMeResult>;

  if (!response.ok || !data.ok || !data.result?.is_bot) {
    throw new Error(data.description ?? "Telegram bot token was rejected.");
  }

  return {
    firstName: data.result.first_name ?? null,
    id: String(data.result.id),
    username: data.result.username ?? null,
  };
}

export async function registerTelegramWebhook(input: {
  appUrl: string;
  botToken: string;
  connectionId: string;
  webhookSecret: string;
  fetchImpl?: TelegramFetch;
}) {
  const fetchImpl = input.fetchImpl ?? fetch;
  const webhookUrl = new URL(
    `/api/telegram/webhook/${input.connectionId}`,
    input.appUrl,
  ).toString();
  const response = await fetchImpl(
    `https://api.telegram.org/bot${input.botToken}/setWebhook`,
    {
      body: JSON.stringify({
        allowed_updates: ["message"],
        secret_token: input.webhookSecret,
        url: webhookUrl,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
  );
  const data = (await response.json()) as TelegramApiResponse<boolean>;

  if (!response.ok || !data.ok) {
    throw new Error(data.description ?? "Telegram setWebhook failed.");
  }

  return { webhookUrl };
}

export async function deleteTelegramWebhook(
  botToken: string,
  fetchImpl: TelegramFetch = fetch,
) {
  await fetchImpl(`https://api.telegram.org/bot${botToken}/deleteWebhook`, {
    body: JSON.stringify({ drop_pending_updates: true }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

export async function sendTelegramMessage(input: {
  botToken: string;
  chatId: string;
  text: string;
  fetchImpl?: TelegramFetch;
}) {
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(
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
