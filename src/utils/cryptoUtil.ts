import crypto from "crypto";
import { ENV } from "../config/env";

const CRYPTO_ALGORITHM = ENV.ALGORITHM
const CRYPTO_ENCRYPTION_KEY = ENV.ENCRYPTION_KEY

if (!CRYPTO_ENCRYPTION_KEY) {
  throw new Error("ENCRYPTION_KEY is missing in environment variables");
}

const KEY = crypto.createHash("sha256").update(CRYPTO_ENCRYPTION_KEY).digest();

export const encrypt = (plainText: string): string => {
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(CRYPTO_ALGORITHM, KEY, iv);

  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);

  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
};

export const decrypt = (cipherText: string): string => {
  const [ivHex, encryptedHex] = cipherText.split(":");

  if (!ivHex || !encryptedHex) {
    throw new Error("Invalid encrypted format");
  }

  const iv = Buffer.from(ivHex, "hex");

  const decipher = crypto.createDecipheriv(CRYPTO_ALGORITHM, KEY, iv);

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
};