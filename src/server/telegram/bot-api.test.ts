import { describe, expect, it, vi } from "vitest";

import {
  getTelegramBotProfile,
  isPlausibleTelegramBotToken,
  registerTelegramWebhook,
} from "./bot-api";

const validToken = "123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZ";

describe("Telegram Bot API helpers", () => {
  it("rejects invalid token format before calling Telegram", async () => {
    const fetchImpl = vi.fn();

    await expect(getTelegramBotProfile("bad-token", fetchImpl)).rejects.toThrow(
      "Invalid Telegram bot token format.",
    );
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(isPlausibleTelegramBotToken(validToken)).toBe(true);
  });

  it("rejects getMe failures", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json(
        { description: "Unauthorized", ok: false },
        { status: 401 },
      ),
    );

    await expect(getTelegramBotProfile(validToken, fetchImpl)).rejects.toThrow(
      "Unauthorized",
    );
  });

  it("returns safe bot metadata only from getMe", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({
        ok: true,
        result: {
          first_name: "Whiteboard Bot",
          id: 42,
          is_bot: true,
          username: "whiteboard_bot",
        },
      }),
    );

    await expect(getTelegramBotProfile(validToken, fetchImpl)).resolves.toEqual(
      {
        firstName: "Whiteboard Bot",
        id: "42",
        username: "whiteboard_bot",
      },
    );
  });

  it("registers a bot-specific webhook with a secret token", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({ ok: true, result: true }),
    );

    await expect(
      registerTelegramWebhook({
        appUrl: "https://ai-whiteboard.nickybruno.com",
        botToken: validToken,
        connectionId: "connection-1",
        fetchImpl,
        webhookSecret: "secret-1",
      }),
    ).resolves.toEqual({
      webhookUrl:
        "https://ai-whiteboard.nickybruno.com/api/telegram/webhook/connection-1",
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      `https://api.telegram.org/bot${validToken}/setWebhook`,
      expect.objectContaining({
        body: JSON.stringify({
          allowed_updates: ["message"],
          secret_token: "secret-1",
          url: "https://ai-whiteboard.nickybruno.com/api/telegram/webhook/connection-1",
        }),
      }),
    );
  });
});
