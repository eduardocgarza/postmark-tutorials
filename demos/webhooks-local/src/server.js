import dotenv from "dotenv";
import express from "express";
import { fileURLToPath } from "node:url";

import { capturePostmarkWebhookHandler } from "./webhooks.js";

dotenv.config({ quiet: true });

const currentFilePath = fileURLToPath(import.meta.url);
const app = express();
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 3000);
const postmarkWebhookPath =
  process.env.POSTMARK_WEBHOOK_PATH || "/webhooks/postmark";
const postmarkOutboundStatsUrl = "https://api.postmarkapp.com/stats/outbound";

// Postmark webhook payloads can include message content, so keep the JSON
// limit higher than Express's small default.
app.use(express.json({ limit: "10mb" }));

// The dev-services sidecar waits for this before opening ngrok.
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Thin proxy for Postmark's outbound stats API. Query params are forwarded so
// tutorial calls can match Postmark's own curl examples.
app.get("/stats/outbound", async (req, res, next) => {
  try {
    const serverToken = process.env.POSTMARK_SERVER_TOKEN;

    if (!serverToken) {
      return res.status(500).json({
        error: "POSTMARK_SERVER_TOKEN is not configured",
      });
    }

    const url = new URL(postmarkOutboundStatsUrl);

    for (const [key, value] of Object.entries(req.query)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          url.searchParams.append(key, item);
        }
      } else if (value !== undefined) {
        url.searchParams.set(key, value);
      }
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Postmark-Server-Token": serverToken,
      },
    });

    const body = await response.text();
    const contentType = response.headers.get("content-type");

    if (contentType) {
      res.set("Content-Type", contentType);
    }

    return res.status(response.status).send(body);
  } catch (error) {
    return next(error);
  }
});

// Both inbound and outbound Postmark webhook settings point to this local
// receiver. `/webhooks` stays as a short alias for manual curl tests.
app.post("/webhooks", capturePostmarkWebhookHandler);
if (postmarkWebhookPath !== "/webhooks") {
  app.post(postmarkWebhookPath, capturePostmarkWebhookHandler);
}

// Keep bad JSON failures explicit; everything else is logged for local demos.
app.use((error, _req, res, _next) => {
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({ error: "Invalid JSON request body" });
  }

  console.error(error);
  return res.status(500).json({ error: "Internal server error" });
});

// Exporting `app` keeps this file testable while still allowing direct startup.
if (process.argv[1] === currentFilePath) {
  const server = app.listen(port, host, () => {
    console.log(`Postmark local app listening on http://${host}:${port}`);
  });

  server.on("error", (error) => {
    console.error(`Failed to start server on ${host}:${port}`);
    console.error(error);
    process.exitCode = 1;
  });
}

export default app;
