CREATE TABLE "applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"company" text NOT NULL,
	"role" text DEFAULT '',
	"season" text DEFAULT '',
	"location" text DEFAULT '',
	"stack" text DEFAULT '',
	"status" text DEFAULT 'Not Applied',
	"applied" text DEFAULT '',
	"oa" text DEFAULT '',
	"interview" text DEFAULT '',
	"offer" text DEFAULT '',
	"comp" text DEFAULT '',
	"platform" text DEFAULT '',
	"link" text DEFAULT '',
	"notes" text DEFAULT ''
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"google_id" text NOT NULL,
	"email" text NOT NULL,
	"name" text DEFAULT '',
	"avatar_url" text DEFAULT '',
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_google_id_unique" UNIQUE("google_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
