ALTER TYPE "public"."member_role" ADD VALUE 'service';--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "scopes" text[] DEFAULT '{}' NOT NULL;