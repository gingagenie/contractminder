CREATE TABLE IF NOT EXISTS "cm_clients" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"jobber_client_id" text NOT NULL,
	"name" text NOT NULL,
	"company_name" text,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cm_clients_org_jobber_client_unique" UNIQUE("org_id","jobber_client_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cm_job_line_items" (
	"id" text PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"name" text NOT NULL,
	"quantity" numeric NOT NULL,
	"unit_price" numeric NOT NULL,
	CONSTRAINT "cm_job_line_items_job_name_unique" UNIQUE("job_id","name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cm_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"jobber_job_id" text NOT NULL,
	"jobber_client_id" text,
	"title" text,
	"job_number" integer,
	"job_status" text NOT NULL,
	"assigned_to" text,
	"created_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "cm_jobs_org_jobber_job_unique" UNIQUE("org_id","jobber_job_id")
);
