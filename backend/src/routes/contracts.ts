import { Router, Request, Response } from "express";
import crypto from "crypto";
import { db } from "../db/client";
import { jobberOrgs, contracts, dismissedSuggestions } from "../db/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

// Resolve org row from jobberAccountId — shared by all handlers
async function resolveOrg(jobberAccountId: string) {
  const [org] = await db
    .select()
    .from(jobberOrgs)
    .where(eq(jobberOrgs.jobberAccountId, jobberAccountId))
    .limit(1);
  return org ?? null;
}

function renewalStatus(nextRenewalDate: string | null): "ok" | "due" | "overdue" {
  if (!nextRenewalDate) return "ok";
  const renewal = new Date(nextRenewalDate).getTime();
  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  if (renewal < now) return "overdue";
  if (renewal - now <= thirtyDaysMs) return "due";
  return "ok";
}

// ---------- POST /api/contracts/confirm ----------
// Body: { jobberAccountId, contracts: ContractSuggestion[] }

router.post("/confirm", async (req: Request, res: Response) => {
  const { jobberAccountId, contracts: suggestions } = req.body as {
    jobberAccountId?: string;
    contracts?: {
      jobberClientId: string;
      clientName: string;
      jobTitle: string;
      detectedFrequency: string;
      lastJobDate: string;
      suggestedRenewalDate: string;
    }[];
  };

  if (!jobberAccountId || !Array.isArray(suggestions) || suggestions.length === 0) {
    res.status(400).json({ error: "Missing jobberAccountId or contracts array" });
    return;
  }

  const org = await resolveOrg(jobberAccountId);
  if (!org) {
    res.status(404).json({ error: "Org not found" });
    return;
  }

  const now = new Date();
  const saved: string[] = [];

  for (const s of suggestions) {
    await db
      .insert(contracts)
      .values({
        id: crypto.randomUUID(),
        orgId: org.id,
        jobberClientId: s.jobberClientId,
        clientName: s.clientName,
        title: s.jobTitle,
        frequency: s.detectedFrequency,
        lastJobDate: s.lastJobDate,
        nextRenewalDate: s.suggestedRenewalDate,
        contractValue: null,
        status: "active",
        confirmedAt: now,
      })
      .onConflictDoUpdate({
        target: [contracts.orgId, contracts.jobberClientId, contracts.title],
        set: {
          frequency: s.detectedFrequency,
          lastJobDate: s.lastJobDate,
          nextRenewalDate: s.suggestedRenewalDate,
          status: "active",
          confirmedAt: now,
        },
      });

    saved.push(`${s.clientName} — ${s.jobTitle}`);
  }

  res.json({ confirmed: saved.length, contracts: saved });
});

// ---------- POST /api/contracts/dismiss ----------
// Body: { jobberAccountId, jobberClientId, jobTitle }

router.post("/dismiss", async (req: Request, res: Response) => {
  const { jobberAccountId, jobberClientId, jobTitle } = req.body as {
    jobberAccountId?: string;
    jobberClientId?: string;
    jobTitle?: string;
  };

  if (!jobberAccountId || !jobberClientId || !jobTitle) {
    res.status(400).json({ error: "Missing jobberAccountId, jobberClientId, or jobTitle" });
    return;
  }

  const org = await resolveOrg(jobberAccountId);
  if (!org) {
    res.status(404).json({ error: "Org not found" });
    return;
  }

  await db
    .insert(dismissedSuggestions)
    .values({
      id: crypto.randomUUID(),
      orgId: org.id,
      jobberClientId,
      title: jobTitle.trim().toLowerCase(),
    })
    .onConflictDoNothing();

  res.json({ dismissed: true });
});

// ---------- GET /api/contracts?jobberAccountId=xxx ----------

router.get("/", async (req: Request, res: Response) => {
  const jobberAccountId = req.query.jobberAccountId as string | undefined;

  if (!jobberAccountId) {
    res.status(400).json({ error: "Missing jobberAccountId query param" });
    return;
  }

  const org = await resolveOrg(jobberAccountId);
  if (!org) {
    res.status(404).json({ error: "Org not found" });
    return;
  }

  const rows = await db
    .select()
    .from(contracts)
    .where(
      and(
        eq(contracts.orgId, org.id),
        eq(contracts.status, "active")
      )
    );

  const result = rows.map((c) => ({
    id: c.id,
    jobberClientId: c.jobberClientId,
    clientName: c.clientName,
    title: c.title,
    frequency: c.frequency,
    lastJobDate: c.lastJobDate,
    nextRenewalDate: c.nextRenewalDate,
    contractValue: c.contractValue,
    confirmedAt: c.confirmedAt,
    renewalStatus: renewalStatus(c.nextRenewalDate),
  }));

  res.json(result);
});

export default router;
