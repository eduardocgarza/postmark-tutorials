import ngrok from "@ngrok/ngrok";
import dotenv from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";

import { registerPostmarkWebhooks } from "./register-postmark-webhooks.js";

dotenv.config({ quiet: true });

const defaultStateFile = path.resolve(process.cwd(), ".dev-services.local.json");
const postmarkStateFile = path.resolve(
  process.cwd(),
  ".postmark-webhooks.local.json",
);

function requireValue(name, value) {
  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function buildWebhookUrl(publicBaseUrl, webhookPath) {
  const normalizedPath = webhookPath.startsWith("/")
    ? webhookPath
    : `/${webhookPath}`;

  return `${publicBaseUrl.replace(/\/+$/, "")}${normalizedPath}`;
}

class DevServicesManager {
  constructor() {
    this.host = process.env.HOST || "127.0.0.1";
    this.port = Number(process.env.PORT || 3000);
    this.localBaseUrl = `http://${this.host}:${this.port}`;
    this.webhookPath =
      process.env.POSTMARK_WEBHOOK_PATH || "/webhooks/postmark";
    this.stateFile = defaultStateFile;
    this.ngrokListener = null;
    this.keepAliveTimer = null;
    this.isShuttingDown = false;
  }

  async start() {
    this.#setupShutdownHandlers();

    // The sidecar waits for the API instead of owning it. That keeps ngrok and
    // Postmark registration stable while nodemon restarts only the API process.
    console.log(`Waiting for Express app at ${this.localBaseUrl}`);
    await this.#waitForHealth();
    console.log("Express app is healthy");

    console.log(`Starting ngrok tunnel to ${this.host}:${this.port}`);
    const publicBaseUrl = await this.#startNgrok();
    const webhookUrl = buildWebhookUrl(publicBaseUrl, this.webhookPath);

    console.log(`ngrok URL: ${publicBaseUrl}`);
    console.log(`Postmark webhook URL: ${webhookUrl}`);

    const postmark = await registerPostmarkWebhooks({
      publicBaseUrl,
      stateFile: postmarkStateFile,
    });

    await this.#writeState({
      startedAt: new Date().toISOString(),
      localBaseUrl: this.localBaseUrl,
      publicBaseUrl,
      webhookUrl: postmark.webhookUrl,
      outboundWebhook: postmark.outboundWebhook,
      inboundHook: postmark.inboundHook,
    });

    this.#logPostmarkResult(postmark);
    console.log(`State: ${path.relative(process.cwd(), this.stateFile)}`);
    console.log("Dev services running. Press Ctrl+C to stop.");

    // Keep this process alive so the programmatic ngrok listener stays open.
    this.keepAliveTimer = setInterval(() => {}, 2 ** 31 - 1);
  }

  async #waitForHealth(timeoutMs = 30000) {
    const startedAt = Date.now();
    const healthUrl = `${this.localBaseUrl}/health`;

    while (Date.now() - startedAt < timeoutMs) {
      try {
        const response = await fetch(healthUrl);

        if (response.ok) {
          return;
        }
      } catch {
        // The API can take a moment to boot, especially when nodemon starts it.
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    throw new Error(`Timed out waiting for ${healthUrl}`);
  }

  async #startNgrok() {
    const authtoken = requireValue(
      "NGROK_AUTHTOKEN",
      process.env.NGROK_AUTHTOKEN,
    );

    this.ngrokListener = await ngrok.forward({
      addr: `${this.host}:${this.port}`,
      authtoken,
    });

    return this.ngrokListener.url();
  }

  async #writeState(data) {
    await fs.writeFile(
      this.stateFile,
      `${JSON.stringify(data, null, 2)}\n`,
      "utf8",
    );
  }

  async #clearState() {
    await fs.rm(this.stateFile, { force: true });
  }

  #logPostmarkResult(postmark) {
    if (postmark.outboundWebhook) {
      console.log(
        `Outbound webhook ${postmark.outboundWebhook.action}: ${postmark.outboundWebhook.id} (${postmark.outboundWebhook.messageStream})`,
      );
    }

    if (postmark.inboundHook) {
      console.log(
        `Inbound hook ${postmark.inboundHook.action}: ${postmark.inboundHook.url}`,
      );
    }
  }

  #setupShutdownHandlers() {
    process.on("SIGINT", () => {
      this.#shutdown("SIGINT").catch((error) => {
        console.error(error);
        process.exit(1);
      });
    });

    process.on("SIGTERM", () => {
      this.#shutdown("SIGTERM").catch((error) => {
        console.error(error);
        process.exit(1);
      });
    });
  }

  async #shutdown(signal) {
    if (this.isShuttingDown) {
      process.exit(1);
    }

    this.isShuttingDown = true;
    console.log(`\nReceived ${signal}, shutting down dev services...`);

    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
    }

    if (this.ngrokListener && typeof this.ngrokListener.close === "function") {
      await this.ngrokListener.close();
    }

    await this.#clearState();
    console.log("Dev services stopped");
    process.exit(0);
  }
}

const devServices = new DevServicesManager();

devServices.start().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
