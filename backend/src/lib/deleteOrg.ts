import { eq, inArray } from "drizzle-orm";
import { db } from "../db/client";
import {
  jobberOrgs,
  clients,
  jobs,
  jobLineItems,
  contracts,
  dismissedSuggestions,
} from "../db/schema";

/**
 * Permanently deletes all ContractMinder data for a Jobber org.
 * Deletes child records first, then org-scoped tables, then the org row.
 * Safe to call if the org doesn't exist (no-op).
 */
export async function deleteOrgData(jobberAccountId: string): Promise<void> {
  const [org] = await db
    .select({ id: jobberOrgs.id })
    .from(jobberOrgs)
    .where(eq(jobberOrgs.jobberAccountId, jobberAccountId))
    .limit(1);

  if (!org) {
    console.log(`[deleteOrg] org not found for ${jobberAccountId} — nothing to delete`);
    return;
  }

  const orgId = org.id;

  // Collect job IDs so we can delete line items that reference them
  const jobRows = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(eq(jobs.orgId, orgId));

  const jobIds = jobRows.map((j) => j.id);

  if (jobIds.length > 0) {
    await db.delete(jobLineItems).where(inArray(jobLineItems.jobId, jobIds));
  }

  await db.delete(jobs).where(eq(jobs.orgId, orgId));
  await db.delete(clients).where(eq(clients.orgId, orgId));
  await db.delete(contracts).where(eq(contracts.orgId, orgId));
  await db.delete(dismissedSuggestions).where(eq(dismissedSuggestions.orgId, orgId));
  await db.delete(jobberOrgs).where(eq(jobberOrgs.id, orgId));

  console.log(`[deleteOrg] deleted all data for org ${orgId} (jobberAccountId=${jobberAccountId})`);
}
