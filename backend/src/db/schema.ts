import { pgTable, text, timestamp, integer, numeric, unique, date } from "drizzle-orm/pg-core";

export const jobberOrgs = pgTable("cm_jobber_orgs", {
  id: text("id").primaryKey(),
  jobberAccountId: text("jobber_account_id").notNull().unique(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const clients = pgTable("cm_clients", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull(),
  jobberClientId: text("jobber_client_id").notNull(),
  name: text("name").notNull(),
  companyName: text("company_name"),
  email: text("email"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("cm_clients_org_jobber_client_unique").on(t.orgId, t.jobberClientId),
]);

export const jobs = pgTable("cm_jobs", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull(),
  jobberJobId: text("jobber_job_id").notNull(),
  jobberClientId: text("jobber_client_id"),
  title: text("title"),
  jobNumber: integer("job_number"),
  jobStatus: text("job_status").notNull(),
  assignedTo: text("assigned_to"),
  propertyAddress: text("property_address").notNull().default(""),
  startAt: timestamp("start_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (t) => [
  unique("cm_jobs_org_jobber_job_unique").on(t.orgId, t.jobberJobId),
]);

export const jobLineItems = pgTable("cm_job_line_items", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull(),
  name: text("name").notNull(),
  quantity: numeric("quantity").notNull(),
  unitPrice: numeric("unit_price").notNull(),
}, (t) => [
  unique("cm_job_line_items_job_name_unique").on(t.jobId, t.name),
]);

export const contracts = pgTable("cm_contracts", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull(),
  jobberClientId: text("jobber_client_id").notNull(),
  clientName: text("client_name").notNull(),
  title: text("title").notNull(),
  propertyAddress: text("property_address").notNull().default(""),
  frequency: text("frequency").notNull(), // monthly | quarterly | annual | custom
  lastJobDate: date("last_job_date"),
  nextRenewalDate: date("next_renewal_date"),
  contractValue: numeric("contract_value"),
  status: text("status").notNull().default("active"), // active | inactive
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("cm_contracts_org_client_title_addr_unique").on(t.orgId, t.jobberClientId, t.title, t.propertyAddress),
]);

export const dismissedSuggestions = pgTable("cm_dismissed_suggestions", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull(),
  jobberClientId: text("jobber_client_id").notNull(),
  title: text("title").notNull(),
  propertyAddress: text("property_address").notNull().default(""),
  dismissedAt: timestamp("dismissed_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("cm_dismissed_org_client_title_addr_unique").on(t.orgId, t.jobberClientId, t.title, t.propertyAddress),
]);

export type JobberOrg = typeof jobberOrgs.$inferSelect;
export type NewJobberOrg = typeof jobberOrgs.$inferInsert;
export type Client = typeof clients.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type Contract = typeof contracts.$inferSelect;
