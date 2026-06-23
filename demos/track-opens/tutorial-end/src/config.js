import dotenv from "dotenv";

dotenv.config({ quiet: true });

export const HOST = process.env.HOST || "127.0.0.1";
export const PORT = Number(process.env.PORT || 3000);
export const POSTMARK_SERVER_TOKEN = process.env.POSTMARK_SERVER_TOKEN;
export const POSTMARK_FROM_EMAIL = process.env.POSTMARK_FROM_EMAIL;
export const POSTMARK_TO_EMAIL = process.env.POSTMARK_TO_EMAIL;
export const POSTMARK_MESSAGE_STREAM =
  process.env.POSTMARK_MESSAGE_STREAM || "outbound";
