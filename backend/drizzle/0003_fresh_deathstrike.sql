CREATE TABLE IF NOT EXISTS "cm_contracts" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"jobber_client_id" text NOT NULL,
	"client_name" text NOT NULL,
	"title" text NOT NULL,
	"frequency" text NOT NULL,
	"last_job_date" date,
	"next_renewal_date" date,
	"contract_value" numeric,
	"status" text DEFAULT 'active' NOT NULL,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cm_contracts_org_client_title_unique" UNIQUE("org_id","jobber_client_id","title")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cm_dismissed_suggestions" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"jobber_client_id" text NOT NULL,
	"title" text NOT NULL,
	"dismissed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cm_dismissed_org_client_title_unique" UNIQUE("org_id","jobber_client_id","title")
);
