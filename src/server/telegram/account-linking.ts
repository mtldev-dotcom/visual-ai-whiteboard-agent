import { createHash, randomBytes, timingSafeEqual } from "crypto";

export const TELEGRAM_LINK_TOKEN_BYTES = 24;
export const TELEGRAM_LINK_TOKEN_TTL_MINUTES = 15;

export type TelegramLinkToken = {
  token: string;
  tokenHash: string;
  expiresAt: Date;
};

export type TelegramSenderProfile = {
  telegramUserId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
};

export function createTelegramLinkToken(
  now: Date = new Date(),
): TelegramLinkToken {
  const token = randomBytes(TELEGRAM_LINK_TOKEN_BYTES).toString("base64url");
  const expiresAt = new Date(
    now.getTime() + TELEGRAM_LINK_TOKEN_TTL_MINUTES * 60_000,
  );

  return {
    expiresAt,
    token,
    tokenHash: hashTelegramLinkToken(token),
  };
}

export function hashTelegramLinkToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function isTelegramLinkTokenExpired(
  expiresAt: Date,
  now: Date = new Date(),
): boolean {
  return expiresAt.getTime() <= now.getTime();
}

export function isValidTelegramLinkTokenFormat(token: string): boolean {
  return /^[A-Za-z0-9_-]{32}$/.test(token);
}

export function safelyCompareTelegramLinkTokens(
  providedToken: string,
  expectedHash: string,
): boolean {
  if (!isValidTelegramLinkTokenFormat(providedToken)) {
    return false;
  }

  const providedHash = Buffer.from(hashTelegramLinkToken(providedToken), "hex");
  const expected = Buffer.from(expectedHash, "hex");

  if (providedHash.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(providedHash, expected);
}
