import type {
  TelegramAccount,
  TelegramLinkToken,
} from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import {
  createTelegramLinkToken,
  hashTelegramLinkToken,
  isTelegramLinkTokenExpired,
  isValidTelegramLinkTokenFormat,
  type TelegramSenderProfile,
} from "@/server/telegram/account-linking";

import { getPrismaClient } from "./client";

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
  telegramUserId: string,
): Promise<TelegramAccount | null> {
  const prisma = getPrismaClient();

  return prisma.telegramAccount.findFirst({
    where: {
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
