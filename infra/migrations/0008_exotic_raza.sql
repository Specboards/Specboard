CREATE TABLE "board_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"card_fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"featured" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "board_preferences_ws_user_uq" UNIQUE("workspace_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "board_preferences" ADD CONSTRAINT "board_preferences_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- RLS: board preferences are visible/editable only to members of their
-- workspace (mirrors 0002_rls_policies.sql). Per-user scoping (a member sees
-- only their own row) is enforced in the query layer.
ALTER TABLE "board_preferences" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY board_preferences_member_all ON "board_preferences"
  FOR ALL USING (specboard_is_member(workspace_id))
  WITH CHECK (specboard_is_member(workspace_id));