import dotenv from "dotenv";

import { WelcomeEmailService } from "../src/system-emails/service.jsx";

dotenv.config();

const response = await WelcomeEmailService.sendWelcome({
  email: process.env.POSTMARK_RECIPIENT_EMAIL,
  firstName: process.env.WELCOME_FIRST_NAME || "Lucy",
  lastName: process.env.WELCOME_LAST_NAME || "Circle",
  appURL: process.env.WELCOME_APP_URL || "https://lucyscircle.ca",
});

console.log(response);
