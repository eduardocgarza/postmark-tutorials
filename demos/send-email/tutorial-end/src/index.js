import dotenv from "dotenv";
dotenv.config();

import express from "express";

import { WelcomeEmailService } from "./system-emails/service.jsx";

const app = express();
const port = process.env.PORT || 3000;
const TO_EMAIL = "eduardo@garza.ca";

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Postmark React Email tutorial",
    endpoints: {
      sendWelcomeEmail: "POST /send-welcome-email",
      renderWelcomeEmail: "POST /render-welcome-email",
    },
  });
});

app.post("/render-welcome-email", async (req, res) => {
  try {
    const message = await WelcomeEmailService.renderWelcome({
      email: req.body.email || TO_EMAIL,
      firstName: req.body.firstName || "Lucy",
      lastName: req.body.lastName || "Circle",
      appURL:
        req.body.appURL ||
        process.env.WELCOME_APP_URL ||
        "https://lucyscircle.ca",
    });

    res.type("html").send(message.html);
  } catch (error) {
    console.error("Email render failed:", error);
    res.status(500).json({
      error: "Email render failed",
      detail: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.post("/send-welcome-email", async (req, res) => {
  try {
    const postmarkResponse = await WelcomeEmailService.sendWelcome({
      email: req.body.email || TO_EMAIL,
      firstName: req.body.firstName || "Lucy",
      lastName: req.body.lastName || "Circle",
      appURL:
        req.body.appURL ||
        process.env.WELCOME_APP_URL ||
        "https://lucyscircle.ca",
    });

    res.status(202).json(postmarkResponse);
  } catch (error) {
    console.error("Postmark send failed:", error);
    res.status(error.statusCode || 500).json({
      error: "Postmark send failed",
      detail: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.listen(port, () => {
  console.log(`API listening at http://localhost:${port}`);
});
