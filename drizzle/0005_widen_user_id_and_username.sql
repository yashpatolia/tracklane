ALTER TABLE "users" ALTER COLUMN "id" TYPE bigint;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" text;
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_unique" ON "users" ("username");
ALTER TABLE "applications" ALTER COLUMN "user_id" TYPE bigint;
