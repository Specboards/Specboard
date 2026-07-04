CREATE TABLE "idea_settings" (
	"workspace_id" uuid PRIMARY KEY NOT NULL,
	"portal_enabled" boolean DEFAULT false NOT NULL,
	"portal_title" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idea_statuses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "idea_statuses_ws_key_uq" UNIQUE("workspace_id","key")
);
--> statement-breakpoint
CREATE TABLE "idea_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"idea_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "idea_votes_idea_user_uq" UNIQUE("idea_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "ideas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"product_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'new' NOT NULL,
	"author_id" uuid,
	"submitter_name" text,
	"submitter_email" text,
	"promoted_feature_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "idea_settings" ADD CONSTRAINT "idea_settings_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idea_statuses" ADD CONSTRAINT "idea_statuses_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idea_votes" ADD CONSTRAINT "idea_votes_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idea_votes" ADD CONSTRAINT "idea_votes_idea_id_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "public"."ideas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_promoted_feature_id_features_id_fk" FOREIGN KEY ("promoted_feature_id") REFERENCES "public"."features"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idea_statuses_ws_idx" ON "idea_statuses" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idea_votes_idea_idx" ON "idea_votes" USING btree ("idea_id");--> statement-breakpoint
CREATE INDEX "idea_votes_ws_idx" ON "idea_votes" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "ideas_ws_idx" ON "ideas" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "ideas_ws_status_idx" ON "ideas" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "ideas_product_idx" ON "ideas" USING btree ("product_id");--> statement-breakpoint
-- RLS: ideas, votes, review stages, and portal settings are visible/editable
-- only to members of their workspace (mirrors releases/workspace_statuses in
-- 0021/0024). Admin-only writes (stages, portal settings) are enforced in the
-- /api/v1 layer, not here. The public voting portal (a later phase) will add a
-- separate, deliberately-scoped unauthenticated read path.
ALTER TABLE "ideas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY ideas_member_all ON "ideas"
  FOR ALL USING (specboard_is_member(workspace_id))
  WITH CHECK (specboard_is_member(workspace_id));--> statement-breakpoint
ALTER TABLE "idea_votes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY idea_votes_member_all ON "idea_votes"
  FOR ALL USING (specboard_is_member(workspace_id))
  WITH CHECK (specboard_is_member(workspace_id));--> statement-breakpoint
ALTER TABLE "idea_statuses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY idea_statuses_member_all ON "idea_statuses"
  FOR ALL USING (specboard_is_member(workspace_id))
  WITH CHECK (specboard_is_member(workspace_id));--> statement-breakpoint
ALTER TABLE "idea_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY idea_settings_member_all ON "idea_settings"
  FOR ALL USING (specboard_is_member(workspace_id))
  WITH CHECK (specboard_is_member(workspace_id));