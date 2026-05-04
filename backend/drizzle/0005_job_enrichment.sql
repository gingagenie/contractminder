ALTER TABLE "cm_jobs" ADD COLUMN IF NOT EXISTS "notes" text;
ALTER TABLE "cm_jobs" ADD COLUMN IF NOT EXISTS "custom_fields" text;
ALTER TABLE "cm_contracts" ADD COLUMN IF NOT EXISTS "times_renewed" integer NOT NULL DEFAULT 0;
