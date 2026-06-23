import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ quiet: true });

export const HOST = process.env.HOST;
export const PORT = Number(process.env.PORT);
export const LOCAL_BASE_URL = `http://${HOST}:${PORT}`;

function getBooleanEnvVar(name, defaultValue) {
  const value = process.env[name];
  if (value === undefined) {
    return defaultValue;
  }

  return value === "true";
}

export const STATE_FILE = path.resolve(
  process.cwd(),
  ".dev-services.local.json",
);

export const POSTMARK_API_BASE_URL = "https://api.postmarkapp.com";
export const POSTMARK_WEBHOOK_PATH = "/webhooks/postmark";
export const POSTMARK_MESSAGE_STREAM = process.env.POSTMARK_MESSAGE_STREAM;
export const POSTMARK_SERVER_TOKEN = process.env.POSTMARK_SERVER_TOKEN;
export const POSTMARK_REGISTER_OUTBOUND_WEBHOOK = getBooleanEnvVar(
  "POSTMARK_REGISTER_OUTBOUND_WEBHOOK",
  false,
);

export const POSTMARK_REGISTER_INBOUND_WEBHOOK = getBooleanEnvVar(
  "POSTMARK_REGISTER_INBOUND_WEBHOOK",
  false,
);

export const POSTMARK_INCLUDE_MESSAGE_CONTENT = getBooleanEnvVar(
  "POSTMARK_INCLUDE_MESSAGE_CONTENT",
  false,
);

export const NGROK_AUTHTOKEN = process.env.NGROK_AUTHTOKEN;

export function buildPostmarkWebhookURL(publicBaseURL) {
  return `${publicBaseURL.replace(/\/+$/, "")}${POSTMARK_WEBHOOK_PATH}`;
}
