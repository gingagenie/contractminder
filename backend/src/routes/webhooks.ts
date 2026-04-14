import { Router, Request, Response } from "express";
import crypto from "crypto";
import { deleteOrgData } from "../lib/deleteOrg";

const router = Router();

interface JobberWebhookPayload {
  topic: string;
  accountId: string;
  data?: unknown;
}

// express.raw({ type: 'application/json' }) is registered for this path in
// index.ts before express.json(), so req.body is a raw Buffer here.
router.post("/jobber", (req: Request, res: Response) => {
  const secret = process.env.JOBBER_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhook] JOBBER_WEBHOOK_SECRET not set");
    res.status(500).json({ error: "Webhook secret not configured" });
    return;
  }

  const signature = req.headers["x-jobber-hmac-sha256"] as string | undefined;
  if (!signature) {
    res.status(401).json({ error: "Missing X-Jobber-Hmac-SHA256 header" });
    return;
  }

  const rawBody = req.body as Buffer;

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(rawBody);
  const digest = "sha256=" + hmac.digest("base64");

  if (
    digest.length !== signature.length ||
    !crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature))
  ) {
    console.warn(`[webhook] invalid HMAC — received="${signature}" expected="${digest}"`);
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  const payload = JSON.parse(rawBody.toString()) as JobberWebhookPayload;
  const { topic, accountId } = payload;

  if (!accountId) {
    res.status(400).json({ error: "Missing accountId in payload" });
    return;
  }

  if (topic === "APP_DISCONNECT") {
    // Respond immediately — Jobber requires a response within 1 second
    res.status(200).json({ ok: true });
    setImmediate(async () => {
      console.log(`[webhook] APP_DISCONNECT for accountId=${accountId} — deleting org data`);
      try {
        await deleteOrgData(accountId);
        console.log(`[webhook] APP_DISCONNECT cleanup complete for ${accountId}`);
      } catch (err) {
        console.error(`[webhook] APP_DISCONNECT cleanup failed for ${accountId}:`, err);
      }
    });
    return;
  }

  // Unknown/unhandled topics — acknowledge and ignore
  res.status(200).json({ ok: true, skipped: true, topic });
});

export default router;
