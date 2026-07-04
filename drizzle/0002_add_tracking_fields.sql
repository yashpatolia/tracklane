ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "next_action" text DEFAULT '';
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "next_action_due" text DEFAULT '';
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;
