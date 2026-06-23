import dotenv from "dotenv";

dotenv.config({ quiet: true });

export const HOST = process.env.HOST;
export const PORT = Number(process.env.PORT);
export const POSTMARK_SERVER_TOKEN = process.env.POSTMARK_SERVER_TOKEN;
export const POSTMARK_WEBHOOK_PATH = "/webhooks/postmark";
