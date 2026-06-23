import fs from "node:fs/promises";
import { PostmarkClient } from "./postmark-client.js";

import {
  STATE_FILE,
  buildPostmarkWebhookURL,
  POSTMARK_MESSAGE_STREAM,
  POSTMARK_INCLUDE_MESSAGE_CONTENT,
  POSTMARK_REGISTER_INBOUND_WEBHOOK,
  POSTMARK_REGISTER_OUTBOUND_WEBHOOK,
} from "./config.js";

export class PostmarkWebhookRegistrar {
  /**
   * @methods Public
   */
  static async register(publicBaseURL) {
    const state = await this.#readState();
    const webhookURL = buildPostmarkWebhookURL(publicBaseURL);

    const result = {
      webhookURL,
      messageStream: POSTMARK_MESSAGE_STREAM,
      outboundWebhook: state.outboundWebhook || null,
      inboundWebhook: state.inboundWebhook || null,
      updatedAt: new Date().toISOString(),
    };

    if (POSTMARK_REGISTER_OUTBOUND_WEBHOOK) {
      result.outboundWebhook = await this.#upsertOutboundWebhook(
        state.outboundWebhook?.id,
        webhookURL,
      );
    }

    if (POSTMARK_REGISTER_INBOUND_WEBHOOK) {
      result.inboundWebhook = await this.#updateInboundWebhook(webhookURL);
    }

    await this.#writeState(result);
    return result;
  }

  /**
   * @methods Private
   */
  static async #readState() {
    try {
      const value = await fs.readFile(STATE_FILE, "utf8");
      return JSON.parse(value);
    } catch (error) {
      if (error.code === "ENOENT") {
        return {};
      }

      throw error;
    }
  }

  static async #writeState(data) {
    await fs.writeFile(
      STATE_FILE,
      `${JSON.stringify(data, null, 2)}\n`,
      "utf8",
    );
  }

  static #outboundWebhookPayload(webhookURL) {
    return {
      Url: webhookURL,
      MessageStream: POSTMARK_MESSAGE_STREAM,
      Triggers: {
        Open: {
          Enabled: true,
          PostFirstOpenOnly: true,
        },
        Click: {
          Enabled: true,
        },
        Delivery: {
          Enabled: true,
        },
        Bounce: {
          Enabled: true,
          IncludeContent: POSTMARK_INCLUDE_MESSAGE_CONTENT,
        },
        SpamComplaint: {
          Enabled: true,
          IncludeContent: POSTMARK_INCLUDE_MESSAGE_CONTENT,
        },
        SubscriptionChange: {
          Enabled: true,
        },
      },
    };
  }

  static async #upsertOutboundWebhook(webhookId, webhookURL) {
    const existingWebhook = webhookId
      ? await PostmarkClient.getWebhook(webhookId)
      : null;

    const payload = this.#outboundWebhookPayload(webhookURL);

    if (existingWebhook) {
      const updatePayload = { ...payload };
      delete updatePayload.MessageStream;

      const updatedWebhook = await PostmarkClient.updateWebhook(
        existingWebhook.ID,
        updatePayload,
      );

      return {
        action: "updated",
        id: updatedWebhook.ID,
        url: updatedWebhook.Url,
        messageStream: updatedWebhook.MessageStream || POSTMARK_MESSAGE_STREAM,
      };
    }

    const createdWebhook = await PostmarkClient.createWebhook(payload);

    return {
      action: "created",
      id: createdWebhook.ID,
      url: createdWebhook.Url,
      messageStream: createdWebhook.MessageStream || POSTMARK_MESSAGE_STREAM,
    };
  }

  static async #updateInboundWebhook(webhookURL) {
    const server = await PostmarkClient.updateServer({
      InboundHookUrl: webhookURL,
    });

    return {
      action: "updated",
      url: server.InboundHookUrl,
    };
  }
}
