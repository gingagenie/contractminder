-- Add property_address to cm_jobs
ALTER TABLE "cm_jobs" ADD COLUMN IF NOT EXISTS "property_address" text NOT NULL DEFAULT '';

-- Add property_address to cm_contracts and update unique constraint
ALTER TABLE "cm_contracts" ADD COLUMN IF NOT EXISTS "property_address" text NOT NULL DEFAULT '';
ALTER TABLE "cm_contracts" DROP CONSTRAINT IF EXISTS "cm_contracts_org_client_title_unique";
ALTER TABLE "cm_contracts" ADD CONSTRAINT "cm_contracts_org_client_title_addr_unique" UNIQUE ("org_id", "jobber_client_id", "title", "property_address");

-- Add property_address to cm_dismissed_suggestions and update unique constraint
ALTER TABLE "cm_dismissed_suggestions" ADD COLUMN IF NOT EXISTS "property_address" text NOT NULL DEFAULT '';
ALTER TABLE "cm_dismissed_suggestions" DROP CONSTRAINT IF EXISTS "cm_dismissed_org_client_title_unique";
ALTER TABLE "cm_dismissed_suggestions" ADD CONSTRAINT "cm_dismissed_org_client_title_addr_unique" UNIQUE ("org_id", "jobber_client_id", "title", "property_address");
