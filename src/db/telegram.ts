import type {
  TelegramAccount,
  TelegramBotConnection,
  TelegramLinkToken,
} from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import type { EncryptedSecret } from "@/server/telegram/credentials";
import {
  createTelegramLinkToken,
  hashTelegramLinkToken,
  isTelegramLinkTokenExpired,
  isValidTelegramLinkTokenFormat,
  type TelegramSenderProfile,
} from "@/server/telegram/account-linking";
import { hashSecret } from "@/server/telegram/credentials";

import { getPrismaClient } from "./client";

export const TELEGRAM_START_IDENTITY_TTL_MINUTES = 15;

export type CreateTelegramLinkTokenInput = {
  ownerUserId: string;
  workspaceId: string;
  now?: Date;
};

export type IssuedTelegramLinkToken = {
  id: string;
  ownerUserId: string;
  workspaceId: string;
  token: string;
  expiresAt: Date;
};

export async function createTelegramLinkTokenRecord(
  input: CreateTelegramLinkTokenInput,
): Promise<IssuedTelegramLinkToken> {
  const prisma = getPrismaClient();
  const linkToken = createTelegramLinkToken(input.now);
  const record = await prisma.telegramLinkToken.create({
    data: {
      expiresAt: linkToken.expiresAt,
      ownerUserId: input.ownerUserId,
      tokenHash: linkToken.tokenHash,
      workspaceId: input.workspaceId,
    },
  });

  return {
    expiresAt: record.expiresAt,
    id: record.id,
    ownerUserId: record.ownerUserId,
    token: linkToken.token,
    workspaceId: record.workspaceId,
  };
}

export type ConsumeTelegramLinkTokenInput = {
  token: string;
  sender: TelegramSenderProfile;
  now?: Date;
};

export type ConsumeTelegramLinkTokenResult =
  | {
      ok: true;
      account: TelegramAccount;
      linkToken: TelegramLinkToken;
    }
  | {
      error: string;
      ok: false;
    };

export async function consumeTelegramLinkToken(
  input: ConsumeTelegramLinkTokenInput,
): Promise<ConsumeTelegramLinkTokenResult> {
  if (!isValidTelegramLinkTokenFormat(input.token)) {
    return { error: "Invalid or expired Telegram link token.", ok: false };
  }

  const prisma = getPrismaClient();
  const tokenHash = hashTelegramLinkToken(input.token);
  const now = input.now ?? new Date();
  const linkToken = await prisma.telegramLinkToken.findUnique({
    where: { tokenHash },
  });

  if (
    !linkToken ||
    linkToken.consumedAt ||
    isTelegramLinkTokenExpired(linkToken.expiresAt, now)
  ) {
    return { error: "Invalid or expired Telegram link token.", ok: false };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const consumedToken = await tx.telegramLinkToken.update({
        data: { consumedAt: now },
        where: { id: linkToken.id },
      });
      const account = await tx.telegramAccount.upsert({
        create: {
          firstName: input.sender.firstName,
          lastName: input.sender.lastName,
          ownerUserId: linkToken.ownerUserId,
          telegramUserId: input.sender.telegramUserId,
          username: input.sender.username,
          workspaceId: linkToken.workspaceId,
        },
        update: {
          firstName: input.sender.firstName,
          lastName: input.sender.lastName,
          linkedAt: now,
          telegramUserId: input.sender.telegramUserId,
          unlinkedAt: null,
          username: input.sender.username,
          workspaceId: linkToken.workspaceId,
        },
        where: { ownerUserId: linkToken.ownerUserId },
      });

      return { account, consumedToken };
    });

    return {
      account: result.account,
      linkToken: result.consumedToken,
      ok: true,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        error: "Telegram account is already linked to another user.",
        ok: false,
      };
    }

    throw error;
  }
}

export async function getActiveTelegramAccount(
  botConnectionId: string,
  telegramUserId: string,
): Promise<TelegramAccount | null> {
  const prisma = getPrismaClient();

  return prisma.telegramAccount.findFirst({
    where: {
      botConnectionId,
      telegramUserId,
      unlinkedAt: null,
    },
  });
}

export async function unlinkTelegramAccount(
  ownerUserId: string,
): Promise<TelegramAccount | null> {
  const prisma = getPrismaClient();

  const account = await prisma.telegramAccount.findUnique({
    where: { ownerUserId },
  });

  if (!account || account.unlinkedAt) {
    return account;
  }

  return prisma.telegramAccount.update({
    data: { unlinkedAt: new Date() },
    where: { ownerUserId },
  });
}

export type SafeTelegramBotConnection = Pick<
  TelegramBotConnection,
  | "botFirstName"
  | "botId"
  | "botUsername"
  | "createdAt"
  | "id"
  | "revokedAt"
  | "updatedAt"
>;

export type TelegramBotConnectionWithToken = SafeTelegramBotConnection &
  Pick<
    TelegramBotConnection,
    | "tokenAuthTag"
    | "tokenCiphertext"
    | "tokenIv"
    | "webhookSecretHash"
    | "workspaceId"
  >;

export async function getActiveTelegramBotConnectionForOwner(
  ownerUserId: string,
): Promise<SafeTelegramBotConnection | null> {
  const prisma = getPrismaClient();

  return prisma.telegramBotConnection.findFirst({
    select: {
      botFirstName: true,
      botId: true,
      botUsername: true,
      createdAt: true,
      id: true,
      revokedAt: true,
      updatedAt: true,
    },
    where: { ownerUserId, revokedAt: null },
  });
}

export async function getTelegramBotConnectionTokenForOwner(
  ownerUserId: string,
): Promise<TelegramBotConnectionWithToken | null> {
  const prisma = getPrismaClient();

  return prisma.telegramBotConnection.findFirst({
    select: {
      botFirstName: true,
      botId: true,
      botUsername: true,
      createdAt: true,
      id: true,
      revokedAt: true,
      tokenAuthTag: true,
      tokenCiphertext: true,
      tokenIv: true,
      updatedAt: true,
      webhookSecretHash: true,
      workspaceId: true,
    },
    where: { ownerUserId, revokedAt: null },
  });
}

export async function getTelegramBotConnectionById(
  id: string,
): Promise<TelegramBotConnectionWithToken | null> {
  const prisma = getPrismaClient();

  return prisma.telegramBotConnection.findFirst({
    select: {
      botFirstName: true,
      botId: true,
      botUsername: true,
      createdAt: true,
      id: true,
      revokedAt: true,
      tokenAuthTag: true,
      tokenCiphertext: true,
      tokenIv: true,
      updatedAt: true,
      webhookSecretHash: true,
      workspaceId: true,
    },
    where: { id, revokedAt: null },
  });
}

export async function upsertTelegramBotConnection(input: {
  botFirstName: string | null;
  botId: string;
  botUsername: string | null;
  id?: string;
  encryptedToken: EncryptedSecret;
  ownerUserId: string;
  token: string;
  webhookSecret: string;
  workspaceId: string;
}): Promise<SafeTelegramBotConnection> {
  const prisma = getPrismaClient();
  const record = await prisma.telegramBotConnection.upsert({
    create: {
      botFirstName: input.botFirstName,
      botId: input.botId,
      botUsername: input.botUsername,
      id: input.id,
      ownerUserId: input.ownerUserId,
      tokenAuthTag: input.encryptedToken.authTag,
      tokenCiphertext: input.encryptedToken.ciphertext,
      tokenHash: hashSecret(input.token),
      tokenIv: input.encryptedToken.iv,
      webhookSecretHash: hashSecret(input.webhookSecret),
      workspaceId: input.workspaceId,
    },
    update: {
      botFirstName: input.botFirstName,
      botId: input.botId,
      botUsername: input.botUsername,
      revokedAt: null,
      tokenAuthTag: input.encryptedToken.authTag,
      tokenCiphertext: input.encryptedToken.ciphertext,
      tokenHash: hashSecret(input.token),
      tokenIv: input.encryptedToken.iv,
      webhookSecretHash: hashSecret(input.webhookSecret),
      workspaceId: input.workspaceId,
    },
    where: { ownerUserId: input.ownerUserId },
  });

  return toSafeBotConnection(record);
}

export async function revokeTelegramBotConnection(
  ownerUserId: string,
): Promise<TelegramBotConnectionWithToken | null> {
  const prisma = getPrismaClient();
  const existing = await getTelegramBotConnectionTokenForOwner(ownerUserId);

  if (!existing) return null;

  await prisma.$transaction([
    prisma.telegramAccount.updateMany({
      data: { unlinkedAt: new Date() },
      where: { ownerUserId, unlinkedAt: null },
    }),
    prisma.telegramBotConnection.update({
      data: { revokedAt: new Date() },
      where: { id: existing.id },
    }),
  ]);

  return existing;
}

export async function recordTelegramStartIdentity(input: {
  botConnectionId: string;
  chatId: string;
  firstName?: string;
  lastName?: string;
  now?: Date;
  telegramUserId: string;
  username?: string;
  workspaceId: string;
}) {
  const prisma = getPrismaClient();
  const now = input.now ?? new Date();
  const expiresAt = new Date(
    now.getTime() + TELEGRAM_START_IDENTITY_TTL_MINUTES * 60_000,
  );

  return prisma.telegramStartIdentity.upsert({
    create: {
      botConnectionId: input.botConnectionId,
      expiresAt,
      firstName: input.firstName,
      lastName: input.lastName,
      seenAt: now,
      telegramChatId: input.chatId,
      telegramUserId: input.telegramUserId,
      username: input.username,
      workspaceId: input.workspaceId,
    },
    update: {
      consumedAt: null,
      expiresAt,
      firstName: input.firstName,
      lastName: input.lastName,
      seenAt: now,
      telegramChatId: input.chatId,
      username: input.username,
      workspaceId: input.workspaceId,
    },
    where: {
      botConnectionId_telegramUserId: {
        botConnectionId: input.botConnectionId,
        telegramUserId: input.telegramUserId,
      },
    },
  });
}

export type LinkTelegramAccountFromStartResult =
  | { account: TelegramAccount; ok: true }
  | { error: string; ok: false };

export async function linkTelegramAccountFromStart(input: {
  botConnectionId: string;
  now?: Date;
  ownerUserId: string;
  telegramUserId: string;
  workspaceId: string;
}): Promise<LinkTelegramAccountFromStartResult> {
  const prisma = getPrismaClient();
  const now = input.now ?? new Date();
  const startIdentity = await prisma.telegramStartIdentity.findFirst({
    where: {
      botConnectionId: input.botConnectionId,
      consumedAt: null,
      expiresAt: { gt: now },
      telegramUserId: input.telegramUserId,
      workspaceId: input.workspaceId,
    },
  });

  if (!startIdentity) {
    return {
      error:
        "Send /start to your Telegram bot first, then paste the ID it replies with.",
      ok: false,
    };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const account = await tx.telegramAccount.upsert({
        create: {
          botConnectionId: input.botConnectionId,
          firstName: startIdentity.firstName,
          lastName: startIdentity.lastName,
          ownerUserId: input.ownerUserId,
          telegramChatId: startIdentity.telegramChatId,
          telegramUserId: input.telegramUserId,
          username: startIdentity.username,
          workspaceId: input.workspaceId,
        },
        update: {
          botConnectionId: input.botConnectionId,
          firstName: startIdentity.firstName,
          lastName: startIdentity.lastName,
          linkedAt: now,
          telegramChatId: startIdentity.telegramChatId,
          telegramUserId: input.telegramUserId,
          unlinkedAt: null,
          username: startIdentity.username,
          workspaceId: input.workspaceId,
        },
        where: { ownerUserId: input.ownerUserId },
      });

      await tx.telegramStartIdentity.update({
        data: { consumedAt: now },
        where: { id: startIdentity.id },
      });

      return account;
    });

    return { account: result, ok: true };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        error: "Telegram account is already linked to another user.",
        ok: false,
      };
    }

    throw error;
  }
}

function toSafeBotConnection(
  connection: TelegramBotConnection,
): SafeTelegramBotConnection {
  return {
    botFirstName: connection.botFirstName,
    botId: connection.botId,
    botUsername: connection.botUsername,
    createdAt: connection.createdAt,
    id: connection.id,
    revokedAt: connection.revokedAt,
    updatedAt: connection.updatedAt,
  };
}
