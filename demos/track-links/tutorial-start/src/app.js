import express from "express";
import postmark from "postmark";
import { HOST, PORT, POSTMARK_SERVER_TOKEN } from "./config.js";

const app = express();

const FROM_EMAIL = "hello@littleacornchildcare.ca";
const TO_EMAIL = "eduardo@garza.ca";
const MESSAGE_STREAM = "outbound";

app.use(express.json({ limit: "1mb" }));

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

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const {
      subject = "Hello from Postmark",
      htmlBody = "<strong>Hello</strong> from the track links tutorial.",
      textBody = "Hello from the track links tutorial.",
    } = body;

    const client = new postmark.ServerClient(POSTMARK_SERVER_TOKEN);
    const response = await client.sendEmail({
      From: FROM_EMAIL,
      To: TO_EMAIL,
      Subject: subject,
      HtmlBody: htmlBody,
      TextBody: textBody,
      MessageStream: MESSAGE_STREAM,
    });

    return res.status(202).json(response);
  } catch (error) {
    return next(error);
  }
});

app.use((error, _req, res, _next) => {
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({ error: "Invalid JSON request body" });
  }

  console.error(error);
  return res.status(error.statusCode || 500).json({
    error: "Postmark send failed",
    detail: error instanceof Error ? error.message : "Unknown error",
  });
});

const server = app.listen(PORT, HOST, () => {
  console.log(
    `Postmark track links app listening on http://${HOST}:${PORT}`,
  );
});

server.on("error", (error) => {
  console.error(`Failed to start server on ${HOST}:${PORT}`);
  console.error(error);
  process.exitCode = 1;
});
