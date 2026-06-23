import { render } from "@react-email/render";

import { postmarkProvider } from "./clients/postmark.js";

export class BaseEmail {
  static verifyInput(input) {
    const { email, subject, template } = input;
    if (!email || !subject || !template) {
      throw new Error("Email, subject, and template are required.");
    }
  }

  static async renderEmail(input) {
    this.verifyInput(input);
    const html = await render(input.template);

    return {
      to: input.email,
      subject: input.subject,
      html,
      text: input.text,
    };
  }

  static async sendEmail(input) {
    const message = await this.renderEmail(input);
    return postmarkProvider.send(message);
  }
}
