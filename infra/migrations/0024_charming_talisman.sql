CREATE TABLE "workspace_statuses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_statuses_ws_key_uq" UNIQUE("workspace_id","key")
);
--> statement-breakpoint
ALTER TABLE "workspace_statuses" ADD CONSTRAINT "workspace_statuses_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workspace_statuses_ws_idx" ON "workspace_statuses" USING btree ("workspace_id");--> statement-breakpoint
-- RLS: workflow stages are visible/editable only to members of their workspace
-- (mirrors workspace_properties/releases in 0021). Admin-only writes are
-- enforced in the /api/v1 layer, not here.
ALTER TABLE "workspace_statuses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY workspace_statuses_member_all ON "workspace_statuses"
  FOR ALL USING (specboard_is_member(workspace_id))
  WITH CHECK (specboard_is_member(workspace_id));