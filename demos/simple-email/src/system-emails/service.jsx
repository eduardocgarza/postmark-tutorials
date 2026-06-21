import * as React from "react";

import { BaseEmail } from "./base.js";
import WelcomeEmail from "./emails/WelcomeEmail.jsx";

export class WelcomeEmailService extends BaseEmail {
  /**
   * @methods
   */
  static build({ email, firstName, lastName, appURL }) {
    const subject = `Welcome to Lucy's Circle, ${firstName}`;
    const text = `Welcome to Lucy's Circle, ${firstName} ${lastName}. Open your account: ${appURL}`;
    const template = (
      <WelcomeEmail firstName={firstName} lastName={lastName} appURL={appURL} />
    );

    return { email, subject, text, template };
  }

  static async renderWelcome(data) {
    return this.renderEmail(this.build(data));
  }

  static async sendWelcome(data) {
    return this.sendEmail(this.build(data));
  }
}
