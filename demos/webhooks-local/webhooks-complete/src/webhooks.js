import path from "node:path";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";

const webhookDir = path.resolve(process.cwd(), "webhooks");

// This handler intentionally does no Postmark-specific branching. Inbound and
// outbound payloads have different shapes, but for a local tutorial receiver we
// only need to log the JSON and keep an exact copy on disk.
export async function capturePostmarkWebhookHandler(req, res, next) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `${timestamp}-${randomUUID()}.json`;
    const filePath = path.join(webhookDir, filename);
    const payload = req.body || {};

    console.log("Postmark webhook received:");
    console.log(JSON.stringify(payload, null, 2));

    // The UUID prevents collisions if Postmark sends multiple events inside the
    // same millisecond, and the timestamp keeps files sortable by arrival time.
    await fs.mkdir(webhookDir, { recursive: true });
    await fs.writeFile(
      filePath,
      `${JSON.stringify(payload, null, 2)}\n`,
      "utf8",
    );

    return res.status(200).json({
      ok: true,
      savedTo: path.relative(process.cwd(), filePath),
    });
  } catch (error) {
    return next(error);
  }
}
