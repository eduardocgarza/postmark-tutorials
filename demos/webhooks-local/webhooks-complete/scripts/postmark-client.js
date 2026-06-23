import { POSTMARK_API_BASE_URL, POSTMARK_SERVER_TOKEN } from "./config.js";

export class PostmarkClient {
  /**
   * @methods Public
   */
  static async getWebhook(webhookID) {
    return this.#request(`/webhooks/${webhookID}`, { allowNotFound: true });
  }

  static async createWebhook(payload) {
    return this.#request("/webhooks", {
      method: "POST",
      body: payload,
    });
  }

  static async updateWebhook(webhookID, payload) {
    return this.#request(`/webhooks/${webhookID}`, {
      method: "PUT",
      body: payload,
    });
  }

  static async updateServer(payload) {
    return this.#request("/server", {
      method: "PUT",
      body: payload,
    });
  }

  /**
   * @methods Private
   */
  static async #request(
    apiPath,
    { method = "GET", body, allowNotFound = false } = {},
  ) {
    const response = await fetch(`${POSTMARK_API_BASE_URL}${apiPath}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
        "X-Postmark-Server-Token": POSTMARK_SERVER_TOKEN,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const responseBody = await this.#parseResponseBody(response);

    if (allowNotFound && this.#isNotFoundResponse(response, responseBody)) {
      return null;
    }

    if (!response.ok) {
      const details =
        typeof responseBody === "string"
          ? responseBody
          : JSON.stringify(responseBody);

      throw new Error(
        `Postmark ${method} ${apiPath} failed with ${response.status}: ${details}`,
      );
    }

    return responseBody;
  }

  static async #parseResponseBody(response) {
    const responseText = await response.text();

    if (!responseText) {
      return null;
    }

    try {
      return JSON.parse(responseText);
    } catch {
      return responseText;
    }
  }

  static #isNotFoundResponse(response, responseBody) {
    return (
      response.status === 404 ||
      (response.status === 422 && responseBody?.ErrorCode === 1302)
    );
  }
}
