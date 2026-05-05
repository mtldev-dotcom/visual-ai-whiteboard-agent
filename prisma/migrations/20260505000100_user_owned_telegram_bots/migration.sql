-- Add user-owned Telegram bot connections and start handshakes.
CREATE TABLE "TelegramBotConnection" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "botUsername" TEXT,
    "botFirstName" TEXT,
    "tokenCiphertext" TEXT NOT NULL,
    "tokenIv" TEXT NOT NULL,
    "tokenAuthTag" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "webhookSecretHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "TelegramBotConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TelegramStartIdentity" (
    "id" TEXT NOT NULL,
    "botConnectionId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "telegramUserId" TEXT NOT NULL,
    "telegramChatId" TEXT NOT NULL,
    "username" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),

    CONSTRAINT "TelegramStartIdentity_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "TelegramAccount" ADD COLUMN "botConnectionId" TEXT;
ALTER TABLE "TelegramAccount" ADD COLUMN "telegramChatId" TEXT;

CREATE UNIQUE INDEX "TelegramBotConnection_ownerUserId_key" ON "TelegramBotConnection"("ownerUserId");
CREATE UNIQUE INDEX "TelegramBotConnection_botId_key" ON "TelegramBotConnection"("botId");
CREATE UNIQUE INDEX "TelegramBotConnection_tokenHash_key" ON "TelegramBotConnection"("tokenHash");
CREATE INDEX "TelegramBotConnection_workspaceId_idx" ON "TelegramBotConnection"("workspaceId");
CREATE INDEX "TelegramBotConnection_revokedAt_idx" ON "TelegramBotConnection"("revokedAt");

CREATE UNIQUE INDEX "TelegramStartIdentity_botConnectionId_telegramUserId_key" ON "TelegramStartIdentity"("botConnectionId", "telegramUserId");
CREATE INDEX "TelegramStartIdentity_workspaceId_idx" ON "TelegramStartIdentity"("workspaceId");
CREATE INDEX "TelegramStartIdentity_expiresAt_idx" ON "TelegramStartIdentity"("expiresAt");
CREATE INDEX "TelegramStartIdentity_consumedAt_idx" ON "TelegramStartIdentity"("consumedAt");

CREATE INDEX "TelegramAccount_botConnectionId_idx" ON "TelegramAccount"("botConnectionId");

ALTER TABLE "TelegramBotConnection" ADD CONSTRAINT "TelegramBotConnection_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TelegramStartIdentity" ADD CONSTRAINT "TelegramStartIdentity_botConnectionId_fkey" FOREIGN KEY ("botConnectionId") REFERENCES "TelegramBotConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TelegramStartIdentity" ADD CONSTRAINT "TelegramStartIdentity_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TelegramAccount" ADD CONSTRAINT "TelegramAccount_botConnectionId_fkey" FOREIGN KEY ("botConnectionId") REFERENCES "TelegramBotConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
