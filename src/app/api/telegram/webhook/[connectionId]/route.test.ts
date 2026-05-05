import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  decryptSecret: vi.fn(() => "bot-token"),
  getTelegramBotConnectionById: vi.fn(),
  handleTelegramTextCommand: vi.fn(),
  parseTelegramCommand: vi.fn((text: string) => text.split(/\s+/, 1)[0]),
  recordTelegramStartIdentity: vi.fn(),
  sendTelegramMessage: vi.fn(),
  verifySecretHash: vi.fn(),
}));

vi.mock("@/db/telegram", () => ({
  getTelegramBotConnectionById: mocks.getTelegramBotConnectionById,
  recordTelegramStartIdentity: mocks.recordTelegramStartIdentity,
}));

vi.mock("@/server/telegram/bot-api", () => ({
  sendTelegramMessage: mocks.sendTelegramMessage,
}));

vi.mock("@/server/telegram/commands", () => ({
  handleTelegramTextCommand: mocks.handleTelegramTextCommand,
  parseTelegramCommand: mocks.parseTelegramCommand,
}));

vi.mock("@/server/telegram/credentials", () => ({
  decryptSecret: mocks.decryptSecret,
  verifySecretHash: mocks.verifySecretHash,
}));

import { POST } from "./route";

const connection = {
  botFirstName: "Bot",
  botId: "42",
  botUsername: "whiteboard_bot",
  createdAt: new Date("2026-05-05T00:00:00.000Z"),
  id: "connection-1",
  revokedAt: null,
  tokenAuthTag: "tag",
  tokenCiphertext: "cipher",
  tokenIv: "iv",
  updatedAt: new Date("2026-05-05T00:00:00.000Z"),
  webhookSecretHash: "hashed-secret",
  workspaceId: "workspace-1",
};

function requestWithMessage(
  text: string,
  secret = "secret",
  chatType = "private",
) {
  return new Request("https://app.test/api/telegram/webhook/connection-1", {
    body: JSON.stringify({
      message: {
        chat: { id: 555, type: chatType },
        from: {
          first_name: "Ada",
          id: 123,
          username: "ada",
        },
        text,
      },
    }),
    headers: { "x-telegram-bot-api-secret-token": secret },
    method: "POST",
  });
}

function context() {
  return { params: Promise.resolve({ connectionId: "connection-1" }) };
}

describe("bot-specific Telegram webhook route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getTelegramBotConnectionById.mockResolvedValue(connection);
    mocks.handleTelegramTextCommand.mockResolvedValue({
      text: "command reply",
    });
    mocks.verifySecretHash.mockReturnValue(true);
  });

  it("rejects webhook requests with an invalid secret header", async () => {
    mocks.verifySecretHash.mockReturnValue(false);

    const response = await POST(requestWithMessage("/start", "bad"), context());

    expect(response.status).toBe(401);
    expect(mocks.sendTelegramMessage).not.toHaveBeenCalled();
  });

  it("records /start identity and replies with the Telegram ID", async () => {
    const response = await POST(requestWithMessage("/start"), context());

    expect(response.status).toBe(200);
    expect(mocks.recordTelegramStartIdentity).toHaveBeenCalledWith({
      botConnectionId: "connection-1",
      chatId: "555",
      firstName: "Ada",
      lastName: undefined,
      telegramUserId: "123",
      username: "ada",
      workspaceId: "workspace-1",
    });
    expect(mocks.sendTelegramMessage).toHaveBeenCalledWith({
      botToken: "bot-token",
      chatId: "555",
      text: "Your Telegram ID is 123. Paste this ID in Settings and click Connect ID.",
    });
  });

  it("dispatches linked commands with bot connection context", async () => {
    const response = await POST(requestWithMessage("/boards"), context());

    expect(response.status).toBe(200);
    expect(mocks.handleTelegramTextCommand).toHaveBeenCalledWith({
      botConnectionId: "connection-1",
      telegramUserId: "123",
      text: "/boards",
    });
    expect(mocks.sendTelegramMessage).toHaveBeenCalledWith({
      botToken: "bot-token",
      chatId: "555",
      text: "command reply",
    });
  });

  it("rejects group chat commands before dispatch", async () => {
    const response = await POST(
      requestWithMessage("/boards", "secret", "group"),
      context(),
    );

    expect(response.status).toBe(200);
    expect(mocks.handleTelegramTextCommand).not.toHaveBeenCalled();
    expect(mocks.sendTelegramMessage).toHaveBeenCalledWith({
      botToken: "bot-token",
      chatId: "555",
      text: "Open a private chat with this bot to connect or use workspace commands.",
    });
  });
});
