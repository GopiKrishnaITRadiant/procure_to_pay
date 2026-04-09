import dotenv from "dotenv";
import path from "path"

dotenv.config({
  path: path.resolve(process.cwd(), ".env.dev"),
});

export const ENV = {
  PORT:process.env.PORT,
  MONGODB_URI:process.env.MONGODB_URI,
  NODE_ENV:process.env.NODE_ENV,
  JWT_SECRET:process.env.JWT_SECRET,
  ALGORITHM: process.env.CRYPTO_ALGORITHM || "aes-256-cbc",
  ENCRYPTION_KEY: process.env.CRYPTO_ENCRYPTION_KEY,
  BASE_URL: process.env.BASE_URL
};