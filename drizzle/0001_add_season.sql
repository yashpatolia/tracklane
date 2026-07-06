UPDATE "applications" SET "season" = '' WHERE "season" IS NULL;
ALTER TABLE "applications" ALTER COLUMN "season" SET DEFAULT '';
ALTER TABLE "applications" ALTER COLUMN "season" SET NOT NULL;
