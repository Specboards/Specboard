ALTER TABLE "repositories" ADD COLUMN "is_spec_repo" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_levels" ADD COLUMN "card_fields" jsonb;