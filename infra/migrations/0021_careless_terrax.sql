CREATE TABLE "releases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"target_date" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "releases_ws_name_uq" UNIQUE("workspace_id","name")
);
--> statement-breakpoint
CREATE TABLE "workspace_properties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"type" text NOT NULL,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"levels" jsonb,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_properties_ws_key_uq" UNIQUE("workspace_id","key")
);
--> statement-breakpoint
ALTER TABLE "features" ADD COLUMN "release_id" uuid;--> statement-breakpoint
ALTER TABLE "releases" ADD CONSTRAINT "releases_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_properties" ADD CONSTRAINT "workspace_properties_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "releases_ws_idx" ON "releases" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "workspace_properties_ws_idx" ON "workspace_properties" USING btree ("workspace_id");--> statement-breakpoint
ALTER TABLE "features" ADD CONSTRAINT "features_release_id_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."releases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "features_release_idx" ON "features" USING btree ("release_id");--> statement-breakpoint
ALTER TABLE "features" DROP COLUMN "priority";--> statement-breakpoint
ALTER TABLE "features" DROP COLUMN "estimate";--> statement-breakpoint
ALTER TABLE "features" DROP COLUMN "roadmap_quarter";--> statement-breakpoint
-- RLS: properties and releases are visible/editable only to members of their
-- workspace (mirrors the per-table policies in 0002_rls_policies.sql).
ALTER TABLE "workspace_properties" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY workspace_properties_member_all ON "workspace_properties"
  FOR ALL USING (specboard_is_member(workspace_id))
  WITH CHECK (specboard_is_member(workspace_id));--> statement-breakpoint
ALTER TABLE "releases" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY releases_member_all ON "releases"
  FOR ALL USING (specboard_is_member(workspace_id))
  WITH CHECK (specboard_is_member(workspace_id));--> statement-breakpoint
-- Reset per-level field availability to the new starting set. The built-in
-- metadata catalog is now just assignee + tags (NULL = all), and custom
-- property availability lives on workspace_properties.levels instead.
UPDATE "workspace_levels" SET "card_fields" = NULL;
