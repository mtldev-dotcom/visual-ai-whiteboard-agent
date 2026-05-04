import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const appUrl = process.env.APP_URL;
const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

if (!botToken) {
  throw new Error("TELEGRAM_BOT_TOKEN is required.");
}

if (!appUrl) {
  throw new Error("APP_URL is required.");
}

const webhookUrl = new URL("/api/telegram/webhook", appUrl).toString();

const response = await fetch(
  `https://api.telegram.org/bot${botToken}/setWebhook`,
  {
    body: JSON.stringify({
      allowed_updates: ["message"],
      secret_token: webhookSecret || undefined,
      url: webhookUrl,
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  },
);

const result = (await response.json()) as {
  description?: string;
  ok?: boolean;
};

if (!response.ok || !result.ok) {
  throw new Error(result.description ?? "Telegram setWebhook failed.");
}

console.log(`Telegram webhook registered: ${webhookUrl}`);
