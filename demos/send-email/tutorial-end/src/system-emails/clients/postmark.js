import postmark from "postmark";

const DEFAULT_MESSAGE_STREAM = "outbound";

class PostmarkProvider {
  #client;

  get #serverToken() {
    return process.env.POSTMARK_SERVER_TOKEN;
  }

  get #fromAddress() {
    return process.env.POSTMARK_SENDER_EMAIL;
  }

  get #messageStream() {
    return process.env.POSTMARK_MESSAGE_STREAM || DEFAULT_MESSAGE_STREAM;
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
    if (!this.#fromAddress) {
      throw new Error("POSTMARK_SENDER_EMAIL is required.");
    }

    return this.#getClient().sendEmail({
      From: this.#fromAddress,
      To: to,
      Subject: subject,
      HtmlBody: html,
      TextBody: text,
      MessageStream: this.#messageStream,
    });
  }
}

export const postmarkProvider = new PostmarkProvider();
