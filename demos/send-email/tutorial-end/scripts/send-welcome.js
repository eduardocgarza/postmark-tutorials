import dotenv from "dotenv";

import { WelcomeEmailService } from "../src/system-emails/service.jsx";

dotenv.config();

const TO_EMAIL = "eduardo@garza.ca";

const response = await WelcomeEmailService.sendWelcome({
  email: TO_EMAIL,
  firstName: process.env.WELCOME_FIRST_NAME || "Lucy",
  lastName: process.env.WELCOME_LAST_NAME || "Circle",
  appURL: process.env.WELCOME_APP_URL || "https://lucyscircle.ca",
});

console.log(response);
