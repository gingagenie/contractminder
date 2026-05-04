import crypto from "crypto";
import { db } from "../db/client";
import { jobberOrgs, clients, jobs, jobLineItems } from "../db/schema";
import { eq } from "drizzle-orm";
import { getValidToken } from "./jobberToken";

const JOBBER_GRAPHQL_URL = "https://api.getjobber.com/api/graphql";
const JOBBER_API_VERSION = "2025-04-16";
const CLIENT_PAGE_SIZE = 50;
const JOB_PAGE_SIZE = 10;

// ---------- GraphQL helper ----------

async function gql<T>(
  accessToken: string,
  query: string,
  variables: Record<string, unknown> = {},
  attempt = 1
): Promise<T> {
  const res = await fetch(JOBBER_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "X-JOBBER-GRAPHQL-VERSION": JOBBER_API_VERSION,
    },
    body: JSON.stringify({ query, variables }),
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`Jobber GraphQL HTTP ${res.status}: ${text}`);
  }

  const json = JSON.parse(text) as { data?: T; errors?: { message: string }[] };

  if (json.errors?.length) {
    const isThrottled = json.errors.some((e) =>
      e.message.toLowerCase().includes("throttl")
    );
    if (isThrottled && attempt < 4) {
      const delay = attempt * 10000;
      console.log(`[sync] Throttled, retrying in ${delay}ms (attempt ${attempt})...`);
      await new Promise((r) => setTimeout(r, delay));
      return gql<T>(accessToken, query, variables, attempt + 1);
    }
    throw new Error(
      `Jobber GraphQL errors: ${json.errors.map((e) => e.message).join(", ")}`
    );
  }

  return json.data as T;
}

// ---------- Jobber response types ----------

interface PageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

interface JobberClientNode {
  id: string;
  firstName: string;
  lastName: string;
  companyName: string | null;
  emails: { address: string }[];
}

interface JobberLineItem {
  name: string;
  quantity: number;
  unitPrice: number;
}

interface JobberCustomField {
  label: string;
  value?: string;
  valueBoolean?: boolean;
}

interface JobberJobNode {
  id: string;
  jobNumber: number | null;
  title: string | null;
  jobStatus: string;
  instructions: string | null;
  startAt: string | null;
  createdAt: string;
  completedAt: string | null;
  client: { id: string } | null;
  property: { address: { street1: string; city: string | null } | null } | null;
  lineItems: { nodes: JobberLineItem[] };
  customFields: JobberCustomField[];
}

// ---------- Client sync ----------

const CLIENTS_QUERY = `
  query GetClients($first: Int!, $after: String) {
    clients(first: $first, after: $after) {
      nodes {
        id
        firstName
        lastName
        companyName
        emails { address }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

async function syncClients(accessToken: string, orgId: string): Promise<number> {
  let cursor: string | null = null;
  let total = 0;

  do {
    const data: { clients: { nodes: JobberClientNode[]; pageInfo: PageInfo } } =
      await gql(accessToken, CLIENTS_QUERY, { first: CLIENT_PAGE_SIZE, after: cursor });

    const nodes = data.clients.nodes;
    if (nodes.length === 0) break;

    for (const c of nodes) {
      const row = {
        id: crypto.randomUUID(),
        orgId,
        jobberClientId: c.id,
        name: [c.firstName, c.lastName].filter(Boolean).join(" ").trim() || "Unknown",
        companyName: c.companyName ?? null,
        email: c.emails[0]?.address ?? null,
      };

      await db
        .insert(clients)
        .values(row)
        .onConflictDoUpdate({
          target: [clients.orgId, clients.jobberClientId],
          set: {
            name: row.name,
            companyName: row.companyName,
            email: row.email,
          },
        });
    }

    total += nodes.length;
    cursor = data.clients.pageInfo.endCursor;
    console.log(`[sync] clients page done, total so far: ${total}`);
  } while (cursor);

  return total;
}

// ---------- Job sync ----------

const JOBS_QUERY = `
  query GetJobs($first: Int!, $after: String) {
    jobs(first: $first, after: $after) {
      nodes {
        id
        jobNumber
        title
        jobStatus
        instructions
        startAt
        createdAt
        completedAt
        client { id }
        property { address { street1 city } }
        lineItems {
          nodes {
            name
            quantity
            unitPrice
          }
        }
        customFields {
          label
          ... on CustomFieldText { value }
          ... on CustomFieldArea { value }
          ... on CustomFieldNumeric { value }
          ... on CustomFieldDate { value }
          ... on CustomFieldDropdown { value }
          ... on CustomFieldBoolean { valueBoolean }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

function safeDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

async function syncJobs(
  accessToken: string,
  orgId: string
): Promise<{ jobsCount: number; lineItemsCount: number }> {
  let cursor: string | null = null;
  let jobsCount = 0;
  let lineItemsCount = 0;

  do {
    const data: { jobs: { nodes: JobberJobNode[]; pageInfo: PageInfo } } =
      await gql(accessToken, JOBS_QUERY, { first: JOB_PAGE_SIZE, after: cursor });

    const nodes = data.jobs.nodes;
    if (nodes.length === 0) break;

    for (const j of nodes) {
      const addrParts = j.property?.address
        ? [j.property.address.street1, j.property.address.city].filter(Boolean)
        : [];
      const propertyAddress = addrParts.join(", ");

      const customFieldsJson = j.customFields.length > 0
        ? JSON.stringify(j.customFields.map((cf) => ({
            label: cf.label,
            value: cf.value ?? (cf.valueBoolean != null ? String(cf.valueBoolean) : ""),
          })))
        : null;

      const jobRow = {
        id: crypto.randomUUID(),
        orgId,
        jobberJobId: j.id,
        jobberClientId: j.client?.id ?? null,
        title: j.title ?? null,
        jobNumber: j.jobNumber ?? null,
        jobStatus: j.jobStatus,
        assignedTo: null,
        propertyAddress,
        startAt: safeDate(j.startAt),
        createdAt: safeDate(j.createdAt) ?? new Date(),
        completedAt: safeDate(j.completedAt),
        notes: j.instructions ?? null,
        customFields: customFieldsJson,
      };

      const [upsertedJob] = await db
        .insert(jobs)
        .values(jobRow)
        .onConflictDoUpdate({
          target: [jobs.orgId, jobs.jobberJobId],
          set: {
            title: jobRow.title,
            jobNumber: jobRow.jobNumber,
            jobStatus: jobRow.jobStatus,
            assignedTo: jobRow.assignedTo,
            propertyAddress: jobRow.propertyAddress,
            startAt: jobRow.startAt,
            completedAt: jobRow.completedAt,
            jobberClientId: jobRow.jobberClientId,
            notes: jobRow.notes,
            customFields: jobRow.customFields,
          },
        })
        .returning({ id: jobs.id });

      const internalJobId = upsertedJob.id;

      for (const li of j.lineItems.nodes) {
        if (!li.name) continue;

        await db
          .insert(jobLineItems)
          .values({
            id: crypto.randomUUID(),
            jobId: internalJobId,
            name: li.name,
            quantity: String(li.quantity),
            unitPrice: String(li.unitPrice),
          })
          .onConflictDoUpdate({
            target: [jobLineItems.jobId, jobLineItems.name],
            set: {
              quantity: String(li.quantity),
              unitPrice: String(li.unitPrice),
            },
          });

        lineItemsCount++;
      }

      jobsCount++;
    }

    cursor = data.jobs.pageInfo.endCursor;
    console.log(`[sync] jobs page done, total so far: ${jobsCount}`);
    if (cursor) await new Promise((r) => setTimeout(r, 2000));
  } while (cursor);

  return { jobsCount, lineItemsCount };
}

// ---------- Public entry point ----------

export interface SyncResult {
  clientsUpserted: number;
  jobsUpserted: number;
  lineItemsUpserted: number;
}

export async function syncOrg(jobberAccountId: string): Promise<SyncResult> {
  const [org] = await db
    .select()
    .from(jobberOrgs)
    .where(eq(jobberOrgs.jobberAccountId, jobberAccountId))
    .limit(1);

  if (!org) throw new Error(`Org not found: ${jobberAccountId}`);

  const accessToken = await getValidToken(jobberAccountId);

  // Warm up connection before heavy sync queries
  console.log(`[sync] warming up Jobber API connection...`);
  await gql(accessToken, "{ account { name } }").catch(() => {});
  await new Promise((r) => setTimeout(r, 3000));
  console.log(`[sync] starting sync for org ${org.id}`);

  const clientsUpserted = await syncClients(accessToken, org.id);
  const { jobsCount, lineItemsCount } = await syncJobs(accessToken, org.id);

  console.log(
    `[sync] complete — clients: ${clientsUpserted}, jobs: ${jobsCount}, line items: ${lineItemsCount}`
  );

  return {
    clientsUpserted,
    jobsUpserted: jobsCount,
    lineItemsUpserted: lineItemsCount,
  };
}
