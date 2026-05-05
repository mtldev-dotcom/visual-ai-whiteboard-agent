import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const WEBHOOK_SECRET_BYTES = 32;

export type EncryptedSecret = {
  ciphertext: string;
  iv: string;
  authTag: string;
};

export function encryptSecret(plaintext: string): EncryptedSecret {
  const key = getAppEncryptionKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  return {
    authTag: cipher.getAuthTag().toString("base64url"),
    ciphertext: ciphertext.toString("base64url"),
    iv: iv.toString("base64url"),
  };
}

export function decryptSecret(secret: EncryptedSecret): string {
  const key = getAppEncryptionKey();
  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(secret.iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(secret.authTag, "base64url"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(secret.ciphertext, "base64url")),
    decipher.final(),
  ]);

  return plaintext.toString("utf8");
}

export function createTelegramWebhookSecret(): string {
  return randomBytes(WEBHOOK_SECRET_BYTES).toString("base64url");
}

export function hashSecret(secret: string): string {
  return createHash("sha256").update(secret, "utf8").digest("hex");
}

export function verifySecretHash(
  secret: string,
  expectedHash: string,
): boolean {
  const actual = Buffer.from(hashSecret(secret), "hex");
  const expected = Buffer.from(expectedHash, "hex");

  if (actual.length !== expected.length) return false;

  return timingSafeEqual(actual, expected);
}

function getAppEncryptionKey(): Buffer {
  const raw = process.env.APP_ENCRYPTION_KEY;

  if (!raw) {
    throw new Error("APP_ENCRYPTION_KEY is required for Telegram tokens.");
  }

  const hexKey = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, "hex") : null;
  const base64Key =
    raw.includes("=") || /^[A-Za-z0-9+/]{43,44}$/.test(raw)
      ? Buffer.from(raw, "base64")
      : null;
  const key = hexKey ?? base64Key;

  if (!key || key.length !== 32) {
    throw new Error(
      "APP_ENCRYPTION_KEY must be a 32-byte base64 value or 64-character hex value.",
    );
  }

  return key;
}
