import postmark from "postmark";

const FROM_EMAIL = "hello@littleacornchildcare.ca";
const MESSAGE_STREAM = "outbound";

class PostmarkProvider {
  #client;

  get #serverToken() {
    return process.env.POSTMARK_SERVER_TOKEN;
  }

  #getClient() {
    if (!this.#serverToken) {
      throw new Error("POSTMARK_SERVER_TOKEN is required.");
    }

    if (!this.#client) {
      this.#client = new postmark.ServerClient(this.#serverToken);
    }

    return this.#client;
  }

  async send({ to, subject, html, text }) {
    return this.#getClient().sendEmail({
      From: FROM_EMAIL,
      To: to,
      Subject: subject,
      HtmlBody: html,
      TextBody: text,
      MessageStream: MESSAGE_STREAM,
    });
  }
}

export const postmarkProvider = new PostmarkProvider();
