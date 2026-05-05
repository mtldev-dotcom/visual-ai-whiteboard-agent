import { randomBytes } from "crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  decryptSecret,
  encryptSecret,
  hashSecret,
  verifySecretHash,
} from "./credentials";

const originalKey = process.env.APP_ENCRYPTION_KEY;

describe("Telegram credential encryption", () => {
  beforeEach(() => {
    process.env.APP_ENCRYPTION_KEY = randomBytes(32).toString("base64");
  });

  afterEach(() => {
    process.env.APP_ENCRYPTION_KEY = originalKey;
  });

  it("round-trips encrypted secrets", () => {
    const encrypted = encryptSecret("123456789:AA_example_token_value");

    expect(decryptSecret(encrypted)).toBe("123456789:AA_example_token_value");
  });

  it("uses a random IV so ciphertext differs for the same plaintext", () => {
    const first = encryptSecret("same-secret");
    const second = encryptSecret("same-secret");

    expect(first.ciphertext).not.toBe(second.ciphertext);
    expect(first.iv).not.toBe(second.iv);
  });

  it("rejects tampered ciphertext", () => {
    const encrypted = encryptSecret("same-secret");

    expect(() =>
      decryptSecret({ ...encrypted, ciphertext: `${encrypted.ciphertext}x` }),
    ).toThrow();
  });

  it("verifies hashed secrets without storing plaintext", () => {
    const hashed = hashSecret("webhook-secret");

    expect(verifySecretHash("webhook-secret", hashed)).toBe(true);
    expect(verifySecretHash("other-secret", hashed)).toBe(false);
  });
});
