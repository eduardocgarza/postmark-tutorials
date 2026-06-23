import express from "express";
import { capturePostmarkWebhookHandler } from "./webhooks.js";
import {
  HOST,
  PORT,
  POSTMARK_SERVER_TOKEN,
  POSTMARK_WEBHOOK_PATH,
} from "./config.js";

const app = express();
const postmarkOutboundStatsUrl = "https://api.postmarkapp.com/stats/outbound";

app.use(express.json({ limit: "10mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/stats/outbound", async (req, res, next) => {
  try {
    if (!POSTMARK_SERVER_TOKEN) {
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
        "X-Postmark-Server-Token": POSTMARK_SERVER_TOKEN,
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

app.post(POSTMARK_WEBHOOK_PATH, capturePostmarkWebhookHandler);

app.use((error, _req, res, _next) => {
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({ error: "Invalid JSON request body" });
  }

  console.error(error);
  return res.status(500).json({ error: "Internal server error" });
});

const server = app.listen(PORT, HOST, () => {
  console.log(`Postmark local app listening on http://${HOST}:${PORT}`);
});

server.on("error", (error) => {
  console.error(`Failed to start server on ${HOST}:${PORT}`);
  console.error(error);
  process.exitCode = 1;
});
