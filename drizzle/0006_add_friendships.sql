CREATE TABLE IF NOT EXISTS "friendships" (
  "id" serial PRIMARY KEY NOT NULL,
  "requester_id" bigint NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "addressee_id" bigint NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "status" text DEFAULT 'pending' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "responded_at" timestamp
);
CREATE UNIQUE INDEX IF NOT EXISTS "friendships_pair_unique"
  ON "friendships" (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id));
CREATE INDEX IF NOT EXISTS "friendships_requester_id_idx" ON "friendships" ("requester_id");
CREATE INDEX IF NOT EXISTS "friendships_addressee_id_idx" ON "friendships" ("addressee_id");
