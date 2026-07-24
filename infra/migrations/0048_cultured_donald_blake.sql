ALTER TABLE "releases" ADD COLUMN "release_notes_mode" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "releases" ADD COLUMN "release_notes_body" text;--> statement-breakpoint
ALTER TABLE "releases" ADD COLUMN "release_notes_url" text;