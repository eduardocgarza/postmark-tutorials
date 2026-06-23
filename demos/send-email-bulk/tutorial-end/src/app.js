import express from "express";
import postmark from "postmark";
import { HOST, PORT, POSTMARK_SERVER_TOKEN } from "./config.js";

const app = express();

const FROM_EMAIL = "hello@littleacornchildcare.ca";
const TO_EMAIL = "eduardo@garza.ca";
const MESSAGE_STREAM = "outbound";
const BULK_MESSAGE_STREAM = "broadcast";
const POSTMARK_BULK_EMAIL_URL = "https://api.postmarkapp.com/email/bulk";

const recipients = [
  { email: "maya.chen@mozartpianos.com", firstName: "Maya", lastName: "Chen" },
  {
    email: "noah.brooks@mozartpianos.com",
    firstName: "Noah",
    lastName: "Brooks",
  },
  {
    email: "sofia.patel@mozartpianos.com",
    firstName: "Sofia",
    lastName: "Patel",
  },
  {
    email: "ethan.rivera@mozartpianos.com",
    firstName: "Ethan",
    lastName: "Rivera",
  },
  {
    email: "olivia.morgan@mozartpianos.com",
    firstName: "Olivia",
    lastName: "Morgan",
  },
];

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
      htmlBody = "<strong>Hello</strong> from the send email bulk tutorial.",
      textBody = "Hello from the send email bulk tutorial.",
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

app.post("/send-bulk-emails", async (_req, res, next) => {
  try {
    if (!POSTMARK_SERVER_TOKEN) {
      return res.status(500).json({
        error: "POSTMARK_SERVER_TOKEN is not configured",
      });
    }

    const payload = {
      From: FROM_EMAIL,
      Subject: "Welcome to Mozart Pianos, {{FirstName}}",
      HtmlBody: `
        <html>
          <body>
            <h1>Welcome to Mozart Pianos, {{FirstName}}</h1>
            <p>Hi {{FirstName}} {{LastName}}, your account is ready.</p>
          </body>
        </html>
      `,
      TextBody:
        "Welcome to Mozart Pianos, {{FirstName}} {{LastName}}. Your account is ready.",
      MessageStream: BULK_MESSAGE_STREAM,
      Messages: recipients.map((recipient) => ({
        To: recipient.email,
        TemplateModel: {
          FirstName: recipient.firstName,
          LastName: recipient.lastName,
        },
      })),
    };

    const postmarkResponse = await globalThis.fetch(POSTMARK_BULK_EMAIL_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": POSTMARK_SERVER_TOKEN,
      },
      body: JSON.stringify(payload),
    });
    const responseBody = await postmarkResponse.json();

    if (!postmarkResponse.ok) {
      const error = new Error("Postmark bulk send failed");
      error.statusCode = postmarkResponse.status;
      error.postmarkResponse = responseBody;
      throw error;
    }

    return res.status(202).json({
      sent: recipients.length,
      recipients: recipients.map((recipient) => recipient.email),
      response: responseBody,
    });
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
    postmarkResponse: error.postmarkResponse,
  });
});

const server = app.listen(PORT, HOST, () => {
  console.log(
    `Postmark send email bulk app listening on http://${HOST}:${PORT}`,
  );
});

server.on("error", (error) => {
  console.error(`Failed to start server on ${HOST}:${PORT}`);
  console.error(error);
  process.exitCode = 1;
});
