import { describe, expect, it } from "vitest";

import {
  createTelegramLinkToken,
  hashTelegramLinkToken,
  isTelegramLinkTokenExpired,
  isValidTelegramLinkTokenFormat,
  safelyCompareTelegramLinkTokens,
  TELEGRAM_LINK_TOKEN_TTL_MINUTES,
} from "./account-linking";

describe("Telegram account linking", () => {
  it("creates a short-lived opaque token and stores a hash separately", () => {
    const now = new Date("2026-05-03T12:00:00.000Z");
    const linkToken = createTelegramLinkToken(now);

    expect(isValidTelegramLinkTokenFormat(linkToken.token)).toBe(true);
    expect(linkToken.tokenHash).toBe(hashTelegramLinkToken(linkToken.token));
    expect(linkToken.tokenHash).not.toBe(linkToken.token);
    expect(linkToken.expiresAt).toEqual(
      new Date(now.getTime() + TELEGRAM_LINK_TOKEN_TTL_MINUTES * 60_000),
    );
  });

  it("compares tokens without accepting malformed input", () => {
    const linkToken = createTelegramLinkToken();

    expect(
      safelyCompareTelegramLinkTokens(linkToken.token, linkToken.tokenHash),
    ).toBe(true);
    expect(
      safelyCompareTelegramLinkTokens("not a real token", linkToken.tokenHash),
    ).toBe(false);
  });

  it("treats tokens expiring now as expired", () => {
    const now = new Date("2026-05-03T12:00:00.000Z");

    expect(isTelegramLinkTokenExpired(now, now)).toBe(true);
    expect(
      isTelegramLinkTokenExpired(new Date("2026-05-03T12:00:01.000Z"), now),
    ).toBe(false);
  });
});
