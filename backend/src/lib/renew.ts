import { db } from "../db/client";
import { contracts } from "../db/schema";
import { eq, sql } from "drizzle-orm";
import { getValidToken } from "./jobberToken";

const JOBBER_GRAPHQL_URL = "https://api.getjobber.com/api/graphql";
const JOBBER_API_VERSION = "2025-04-16";

// ---------- GraphQL helper ----------

async function gqlFetch<T>(accessToken: string, query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(JOBBER_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "X-JOBBER-GRAPHQL-VERSION": JOBBER_API_VERSION,
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json() as { data?: T; errors?: { message: string }[] };
  if (!res.ok || body.errors?.length) {
    throw new Error(`Jobber GraphQL error: ${(body.errors ?? []).map((e) => e.message).join(", ")}`);
  }
  return body.data as T;
}

// ---------- Date arithmetic ----------

function addFrequency(date: Date, frequency: string): Date {
  const d = new Date(date);
  switch (frequency) {
    case "monthly":   d.setMonth(d.getMonth() + 1); break;
    case "quarterly": d.setMonth(d.getMonth() + 3); break;
    case "annual":    d.setFullYear(d.getFullYear() + 1); break;
    default:          d.setDate(d.getDate() + 365);
  }
  return d;
}

function toDateString(d: Date): string {
  return d.toISOString().split("T")[0];
}

// ---------- Fetch client's first property ID ----------

async function getPropertyId(accessToken: string, jobberClientId: string): Promise<string> {
  const data = await gqlFetch<{
    client: { clientProperties: { nodes: { id: string }[] } } | null;
  }>(accessToken, `{
    client(id: "${jobberClientId}") {
      clientProperties { nodes { id } }
    }
  }`);

  const propertyId = data.client?.clientProperties?.nodes?.[0]?.id;
  if (!propertyId) throw new Error(`No property found for client: ${jobberClientId}`);
  return propertyId;
}

// ---------- jobCreate mutation ----------

const JOB_CREATE_MUTATION = `
  mutation JobCreate($input: JobCreateAttributes!) {
    jobCreate(input: $input) {
      job {
        id
        jobNumber
      }
      userErrors {
        message
        path
      }
    }
  }
`;

// ---------- Single contract renewal ----------

export interface RenewResult {
  contractId: string;
  clientName: string;
  title: string;
  jobberJobId: string;
  jobNumber: number | null;
  newRenewalDate: string;
}

export async function renewContract(
  contractId: string,
  jobberAccountId: string
): Promise<RenewResult> {
  const [contract] = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, contractId))
    .limit(1);

  if (!contract) throw new Error(`Contract not found: ${contractId}`);
  if (!contract.nextRenewalDate) throw new Error("Contract has no renewal date set");

  const accessToken = await getValidToken(jobberAccountId);
  const startDate = new Date(contract.nextRenewalDate);
  const propertyId = await getPropertyId(accessToken, contract.jobberClientId);

  const data = await gqlFetch<{
    jobCreate: {
      job: { id: string; jobNumber: number | null } | null;
      userErrors: { message: string }[];
    };
  }>(accessToken, JOB_CREATE_MUTATION, {
    input: {
      propertyId,
      title: contract.title,
      timeframe: { startAt: toDateString(startDate) },
      invoicing: {
        invoicingType: "FIXED_PRICE",
        invoicingSchedule: "ON_COMPLETION",
      },
    },
  });

  const userErrors = data.jobCreate?.userErrors ?? [];
  if (userErrors.length > 0) {
    throw new Error(`jobCreate userErrors: ${userErrors.map((e) => e.message).join(", ")}`);
  }

  const createdJob = data.jobCreate?.job;
  if (!createdJob) throw new Error("jobCreate returned no job");

  // Advance: last_job_date = today, next_renewal_date += frequency
  const today = toDateString(new Date());
  const newRenewalDate = toDateString(addFrequency(startDate, contract.frequency));

  await db
    .update(contracts)
    .set({
      lastJobDate: today,
      nextRenewalDate: newRenewalDate,
      timesRenewed: sql`${contracts.timesRenewed} + 1`,
    })
    .where(eq(contracts.id, contractId));

  return {
    contractId,
    clientName: contract.clientName,
    title: contract.title,
    jobberJobId: createdJob.id,
    jobNumber: createdJob.jobNumber,
    newRenewalDate,
  };
}
