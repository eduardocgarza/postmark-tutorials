import dotenv from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config({ quiet: true });

const currentFilePath = fileURLToPath(import.meta.url);
const postmarkApiBaseUrl = "https://api.postmarkapp.com";
const markerHeaderName = "X-Postmark-Local-Demo";
const markerHeaderValue = "postmark-webhooks-local";
const defaultWebhookPath = "/webhooks/postmark";
const defaultStateFile = path.resolve(
  process.cwd(),
  ".postmark-webhooks.local.json",
);

function boolEnv(name, defaultValue) {
  const value = process.env[name];

  if (value === undefined || value === "") {
    return defaultValue;
  }

  return value.toLowerCase() === "true";
}

function requireValue(name, value) {
  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function normalizePath(value) {
  if (!value) {
    return defaultWebhookPath;
  }

  return value.startsWith("/") ? value : `/${value}`;
}

export function buildWebhookUrl(publicBaseUrl, webhookPath) {
  const baseUrl = trimTrailingSlash(
    requireValue("PUBLIC_BASE_URL", publicBaseUrl),
  );

  return `${baseUrl}${normalizePath(webhookPath)}`;
}

class JsonStateStore {
  constructor(filePath) {
    this.filePath = filePath;
  }

  async read(defaultValue = {}) {
    try {
      const value = await fs.readFile(this.filePath, "utf8");
      return JSON.parse(value);
    } catch (error) {
      if (error.code === "ENOENT") {
        return defaultValue;
      }

      throw error;
    }
  }

  async write(data) {
    await fs.writeFile(
      this.filePath,
      `${JSON.stringify(data, null, 2)}\n`,
      "utf8",
    );
  }
}

class PostmarkApiClient {
  constructor(token) {
    this.token = token;
  }

  async request(
    apiPath,
    { method = "GET", body, allowNotFound = false } = {},
  ) {
    const response = await fetch(`${postmarkApiBaseUrl}${apiPath}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
        "X-Postmark-Server-Token": this.token,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const responseBody = await this.#parseResponseBody(response);

    if (allowNotFound && response.status === 404) {
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

  async #parseResponseBody(response) {
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
}

export class PostmarkWebhookRegistrar {
  constructor(options = {}) {
    this.token = requireValue(
      "POSTMARK_SERVER_TOKEN",
      options.postmarkServerToken || process.env.POSTMARK_SERVER_TOKEN,
    );
    this.publicBaseUrl = options.publicBaseUrl || process.env.PUBLIC_BASE_URL;
    this.webhookPath =
      options.webhookPath ||
      process.env.POSTMARK_WEBHOOK_PATH ||
      defaultWebhookPath;
    this.webhookUrl = buildWebhookUrl(this.publicBaseUrl, this.webhookPath);
    this.messageStream =
      options.messageStream ||
      process.env.POSTMARK_MESSAGE_STREAM ||
      "outbound";
    this.registerOutbound =
      options.registerOutbound ??
      boolEnv("POSTMARK_REGISTER_OUTBOUND_WEBHOOK", true);
    this.registerInbound =
      options.registerInbound ??
      boolEnv("POSTMARK_REGISTER_INBOUND_WEBHOOK", true);
    this.includeMessageContent =
      options.includeMessageContent ??
      boolEnv("POSTMARK_INCLUDE_MESSAGE_CONTENT", true);
    this.stateFile = options.stateFile || defaultStateFile;
    this.stateStore = new JsonStateStore(this.stateFile);
    this.api = new PostmarkApiClient(this.token);
  }

  async register() {
    const state = await this.stateStore.read();
    const result = {
      webhookUrl: this.webhookUrl,
      messageStream: this.messageStream,
      outboundWebhook: state.outboundWebhook || null,
      inboundHook: state.inboundHook || null,
      updatedAt: new Date().toISOString(),
    };

    // Outbound events are stream-level webhooks managed by the Webhooks API.
    if (this.registerOutbound) {
      result.outboundWebhook = await this.#upsertOutboundWebhook(state);
    }

    // Inbound email is server-level; Postmark stores one InboundHookUrl.
    if (this.registerInbound) {
      result.inboundHook = await this.#updateInboundHook();
    }

    await this.stateStore.write(result);
    return result;
  }

  #buildOutboundWebhookPayload() {
    return {
      Url: this.webhookUrl,
      MessageStream: this.messageStream,
      // This marker lets future runs find the demo webhook even if local state
      // is deleted and the ngrok URL has changed.
      HttpHeaders: [
        {
          Name: markerHeaderName,
          Value: markerHeaderValue,
        },
      ],
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
          IncludeContent: this.includeMessageContent,
        },
        SpamComplaint: {
          Enabled: true,
          IncludeContent: this.includeMessageContent,
        },
        SubscriptionChange: {
          Enabled: true,
        },
      },
    };
  }

  #hasMarkerHeader(webhook) {
    return webhook.HttpHeaders?.some((header) => {
      return (
        header.Name === markerHeaderName && header.Value === markerHeaderValue
      );
    });
  }

  async #getSavedWebhook(id) {
    if (!id) {
      return null;
    }

    return this.api.request(`/webhooks/${id}`, {
      allowNotFound: true,
    });
  }

  async #findExistingOutboundWebhook(savedWebhookId) {
    const savedWebhook = await this.#getSavedWebhook(savedWebhookId);

    if (savedWebhook) {
      return savedWebhook;
    }

    const params = new URLSearchParams({ MessageStream: this.messageStream });
    const result = await this.api.request(`/webhooks?${params.toString()}`);
    const webhooks = result?.Webhooks || [];

    // Lookup order: saved ID, marker header, then exact URL as a final fallback.
    return (
      webhooks.find((webhook) => this.#hasMarkerHeader(webhook)) ||
      webhooks.find((webhook) => webhook.Url === this.webhookUrl) ||
      null
    );
  }

  async #upsertOutboundWebhook(state) {
    const existingWebhook = await this.#findExistingOutboundWebhook(
      state.outboundWebhook?.id,
    );
    const payload = this.#buildOutboundWebhookPayload();

    if (existingWebhook) {
      const updatePayload = { ...payload };
      delete updatePayload.MessageStream;

      const updatedWebhook = await this.api.request(
        `/webhooks/${existingWebhook.ID}`,
        {
          method: "PUT",
          body: updatePayload,
        },
      );

      return {
        action: "updated",
        id: updatedWebhook.ID,
        url: updatedWebhook.Url,
        messageStream: updatedWebhook.MessageStream || this.messageStream,
      };
    }

    const createdWebhook = await this.api.request("/webhooks", {
      method: "POST",
      body: payload,
    });

    return {
      action: "created",
      id: createdWebhook.ID,
      url: createdWebhook.Url,
      messageStream: createdWebhook.MessageStream || this.messageStream,
    };
  }

  async #updateInboundHook() {
    const server = await this.api.request("/server", {
      method: "PUT",
      body: {
        InboundHookUrl: this.webhookUrl,
      },
    });

    return {
      action: "updated",
      url: server.InboundHookUrl,
    };
  }
}

export async function registerPostmarkWebhooks(options = {}) {
  const registrar = new PostmarkWebhookRegistrar(options);
  return registrar.register();
}

async function main() {
  try {
    const result = await registerPostmarkWebhooks();

    console.log("Postmark webhooks configured");
    console.log(`Webhook URL: ${result.webhookUrl}`);

    if (result.outboundWebhook) {
      console.log(
        `Outbound webhook ${result.outboundWebhook.action}: ${result.outboundWebhook.id} (${result.outboundWebhook.messageStream})`,
      );
    }

    if (result.inboundHook) {
      console.log(
        `Inbound hook ${result.inboundHook.action}: ${result.inboundHook.url}`,
      );
    }

    console.log(`State: ${path.relative(process.cwd(), defaultStateFile)}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

if (process.argv[1] === currentFilePath) {
  main();
}
