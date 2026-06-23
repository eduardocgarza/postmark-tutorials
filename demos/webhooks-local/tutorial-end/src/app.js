import express from "express";
import postmark from "postmark";
import { capturePostmarkWebhookHandler } from "./webhooks.js";
import { HOST, PORT, POSTMARK_SERVER_TOKEN } from "./config.js";

const app = express();

const FROM_EMAIL = "hello@littleacornchildcare.ca";
const TO_EMAIL = "eduardo@garza.ca";

app.use(express.json({ limit: "10mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/send-email", async (req, res, next) => {
  try {
    if (!POSTMARK_SERVER_TOKEN) {
      return res.status(500).json({
        error: "POSTMARK_SERVER_TOKEN is not configured",
      });
    }

    const client = new postmark.ServerClient(POSTMARK_SERVER_TOKEN);
    const response = await client.sendEmail({
      From: FROM_EMAIL,
      To: TO_EMAIL,
      Subject: "Hello from Postmark",
      HtmlBody: "<strong>Hello</strong> dear Postmark user.",
      TextBody: "Hello from Postmark!",
      MessageStream: "outbound",
    });

    return res.status(202).json(response);
  } catch (error) {
    return next(error);
  }
});

app.post("/webhooks/postmark", capturePostmarkWebhookHandler);

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
