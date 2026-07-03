CREATE TABLE "detail_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "detail_templates_ws_name_uq" UNIQUE("workspace_id","name")
);
--> statement-breakpoint
ALTER TABLE "features" ADD COLUMN "details" text;--> statement-breakpoint
ALTER TABLE "workspace_levels" ADD COLUMN "detail_template_id" uuid;--> statement-breakpoint
ALTER TABLE "detail_templates" ADD CONSTRAINT "detail_templates_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "detail_templates_ws_idx" ON "detail_templates" USING btree ("workspace_id");--> statement-breakpoint
ALTER TABLE "workspace_levels" ADD CONSTRAINT "workspace_levels_detail_template_id_detail_templates_id_fk" FOREIGN KEY ("detail_template_id") REFERENCES "public"."detail_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- RLS: detail templates are visible/editable only to members of their
-- workspace (mirrors workspace_properties/releases in 0021). Admin-only writes
-- are enforced in the /api/v1 layer, not here.
ALTER TABLE "detail_templates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY detail_templates_member_all ON "detail_templates"
  FOR ALL USING (specboard_is_member(workspace_id))
  WITH CHECK (specboard_is_member(workspace_id));
