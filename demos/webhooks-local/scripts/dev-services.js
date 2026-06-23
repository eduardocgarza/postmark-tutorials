import path from "node:path";
import ngrok from "@ngrok/ngrok";
import { PostmarkWebhookRegistrar } from "./postmark-webhook-registrar.js";
import {
  HOST,
  PORT,
  STATE_FILE,
  LOCAL_BASE_URL,
  NGROK_AUTHTOKEN,
} from "./config.js";

class DevServices {
  /**
   * @properties
   */
  ngrokListener = null;
  keepAliveTimer = null;
  isShuttingDown = false;

  /**
   * @methods Public
   */
  async start() {
    this.setupShutdownHandlers();

    // Nodemon owns the API process. This sidecar only owns ngrok and Postmark.
    console.log(`Waiting for Express app at ${LOCAL_BASE_URL}`);
    await this.waitForHealth();
    console.log("Express app is healthy");

    console.log(`Starting ngrok tunnel to ${HOST}:${PORT}`);
    const publicBaseURL = await this.startNgrok();
    console.log(`ngrok URL: ${publicBaseURL}`);

    try {
      const postmark = await PostmarkWebhookRegistrar.register(publicBaseURL);

      console.log(`Postmark webhook URL: ${postmark.webhookURL}`);
      this.logPostmarkResult(postmark);
    } catch (error) {
      await this.closeNgrok();
      throw error;
    }

    console.log(`State: ${path.relative(process.cwd(), STATE_FILE)}`);
    console.log("Dev services running. Press Ctrl+C to stop.");

    this.keepAliveTimer = setInterval(() => {}, 2 ** 31 - 1);
  }

  async waitForHealth() {
    const timeoutMs = 30000;
    const startedAt = Date.now();
    const healthURL = `${LOCAL_BASE_URL}/health`;

    while (Date.now() - startedAt < timeoutMs) {
      try {
        const response = await fetch(healthURL);
        if (response.ok) {
          return;
        }
      } catch {
        // The API may still be booting.
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    throw new Error(`Timed out waiting for ${healthURL}`);
  }

  async startNgrok() {
    this.ngrokListener = await ngrok.forward({
      addr: `${HOST}:${PORT}`,
      authtoken: NGROK_AUTHTOKEN,
    });

    return this.ngrokListener.url();
  }

  logPostmarkResult(postmark) {
    if (postmark.outboundWebhook) {
      console.log(
        `Outbound webhook ${postmark.outboundWebhook.action}: ${postmark.outboundWebhook.id} (${postmark.outboundWebhook.messageStream})`,
      );
    }

    if (postmark.inboundWebhook) {
      console.log(
        `Inbound webhook ${postmark.inboundWebhook.action}: ${postmark.inboundWebhook.url}`,
      );
    }
  }

  setupShutdownHandlers() {
    process.on("SIGINT", () => {
      this.shutdown("SIGINT").catch((error) => {
        console.error(error);
        process.exit(1);
      });
    });

    process.on("SIGTERM", () => {
      this.shutdown("SIGTERM").catch((error) => {
        console.error(error);
        process.exit(1);
      });
    });
  }

  async shutdown(signal) {
    if (this.isShuttingDown) {
      process.exit(1);
    }

    this.isShuttingDown = true;
    console.log(`\nReceived ${signal}, shutting down dev services...`);

    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
    }

    await this.closeNgrok();

    console.log("Dev services stopped");
    process.exit(0);
  }

  async closeNgrok() {
    if (this.ngrokListener && typeof this.ngrokListener.close === "function") {
      await this.ngrokListener.close();
      this.ngrokListener = null;
    }
  }
}

const devServices = new DevServices();

devServices.start().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
