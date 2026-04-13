import { db } from "../db/client";
import { jobberOrgs, clients, jobs } from "../db/schema";
import { eq } from "drizzle-orm";

// ---------- Types ----------

export type DetectedFrequency = "monthly" | "quarterly" | "annual" | "irregular";
export type Confidence = "high" | "medium" | "low";

export interface ContractSuggestion {
  jobberClientId: string;
  clientName: string;
  jobTitle: string;
  detectedFrequency: DetectedFrequency;
  lastJobDate: string;          // ISO date string
  suggestedRenewalDate: string; // ISO date string
  confidence: Confidence;
  jobCount: number;
}

// ---------- Frequency bands (days) with ±20% tolerance ----------

const FREQUENCIES: { name: DetectedFrequency; days: number }[] = [
  { name: "monthly",   days: 30  },
  { name: "quarterly", days: 90  },
  { name: "annual",    days: 365 },
];

const TOLERANCE = 0.20;

function classifySpacing(avgDays: number): DetectedFrequency {
  for (const { name, days } of FREQUENCIES) {
    if (avgDays >= days * (1 - TOLERANCE) && avgDays <= days * (1 + TOLERANCE)) {
      return name;
    }
  }
  return "irregular";
}

function renewalDate(lastDate: Date, frequency: DetectedFrequency, avgDays: number): Date {
  const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
  switch (frequency) {
    case "monthly":   return addDays(lastDate, 30);
    case "quarterly": return addDays(lastDate, 90);
    case "annual":    return addDays(lastDate, 365);
    default:          return addDays(lastDate, Math.round(avgDays));
  }
}

function calcConfidence(
  jobCount: number,
  frequency: DetectedFrequency,
  spacings: number[]
): Confidence {
  if (frequency === "irregular") return "low";

  // Coefficient of variation — how consistent are the gaps?
  const mean = spacings.reduce((a, b) => a + b, 0) / spacings.length;
  const variance = spacings.reduce((sum, s) => sum + (s - mean) ** 2, 0) / spacings.length;
  const cv = Math.sqrt(variance) / mean; // 0 = perfectly consistent

  if (jobCount >= 3 && cv <= 0.15) return "high";
  if (jobCount >= 2 && cv <= 0.20) return "medium";
  return "low";
}

// ---------- Main detection function ----------

export async function detectRecurringContracts(
  jobberAccountId: string
): Promise<ContractSuggestion[]> {
  // Resolve org
  const [org] = await db
    .select()
    .from(jobberOrgs)
    .where(eq(jobberOrgs.jobberAccountId, jobberAccountId))
    .limit(1);

  if (!org) throw new Error(`Org not found: ${jobberAccountId}`);

  // Fetch all clients for this org
  const orgClients = await db
    .select()
    .from(clients)
    .where(eq(clients.orgId, org.id));

  const clientMap = new Map(orgClients.map((c) => [c.jobberClientId, c]));

  // Fetch all jobs for this org that have a title and a client
  // Use startAt (scheduled date) for pattern detection — falls back to createdAt
  const orgJobs = await db
    .select()
    .from(jobs)
    .where(eq(jobs.orgId, org.id));

  // Group by clientId + normalised title
  const groups = new Map<string, typeof orgJobs>();

  for (const job of orgJobs) {
    if (!job.jobberClientId || !job.title) continue;

    const title = job.title.trim().toLowerCase();
    const key = `${job.jobberClientId}|||${title}`;

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(job);
  }

  const suggestions: ContractSuggestion[] = [];

  for (const [key, groupJobs] of groups) {
    if (groupJobs.length < 2) continue;

    // Use startAt (scheduled date) where available, fall back to createdAt
    const dateOf = (j: (typeof orgJobs)[number]) =>
      new Date(j.startAt ?? j.createdAt);

    // Sort chronologically by service date
    const sorted = [...groupJobs].sort(
      (a, b) => dateOf(a).getTime() - dateOf(b).getTime()
    );

    // Calculate gaps between consecutive jobs in days
    const spacings: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const diffMs = dateOf(sorted[i]).getTime() - dateOf(sorted[i - 1]).getTime();
      spacings.push(diffMs / 86400000);
    }

    const avgSpacing = spacings.reduce((a, b) => a + b, 0) / spacings.length;
    const frequency = classifySpacing(avgSpacing);
    const confidence = calcConfidence(groupJobs.length, frequency, spacings);

    const [, rawTitle] = key.split("|||");
    const clientId = sorted[0].jobberClientId!;
    const client = clientMap.get(clientId);
    const lastJob = sorted[sorted.length - 1];
    const lastDate = dateOf(lastJob);
    const renewal = renewalDate(lastDate, frequency, avgSpacing);

    suggestions.push({
      jobberClientId: clientId,
      clientName: client?.name ?? "Unknown",
      jobTitle: rawTitle,
      detectedFrequency: frequency,
      lastJobDate: lastDate.toISOString().split("T")[0],
      suggestedRenewalDate: renewal.toISOString().split("T")[0],
      confidence,
      jobCount: groupJobs.length,
    });
  }

  // Sort: high confidence first, then by client name
  suggestions.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    if (order[a.confidence] !== order[b.confidence]) {
      return order[a.confidence] - order[b.confidence];
    }
    return a.clientName.localeCompare(b.clientName);
  });

  return suggestions;
}
