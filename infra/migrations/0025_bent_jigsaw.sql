CREATE TABLE "feature_gate_completions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"feature_id" uuid NOT NULL,
	"gate_id" uuid NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_by" uuid,
	CONSTRAINT "feature_gate_completions_uq" UNIQUE("feature_id","gate_id")
);
--> statement-breakpoint
CREATE TABLE "workspace_stage_gates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"stage_key" text NOT NULL,
	"label" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feature_gate_completions" ADD CONSTRAINT "feature_gate_completions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_gate_completions" ADD CONSTRAINT "feature_gate_completions_feature_id_features_id_fk" FOREIGN KEY ("feature_id") REFERENCES "public"."features"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_gate_completions" ADD CONSTRAINT "feature_gate_completions_gate_id_workspace_stage_gates_id_fk" FOREIGN KEY ("gate_id") REFERENCES "public"."workspace_stage_gates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_stage_gates" ADD CONSTRAINT "workspace_stage_gates_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feature_gate_completions_feature_idx" ON "feature_gate_completions" USING btree ("feature_id");--> statement-breakpoint
CREATE INDEX "feature_gate_completions_gate_idx" ON "feature_gate_completions" USING btree ("gate_id");--> statement-breakpoint
CREATE INDEX "workspace_stage_gates_ws_idx" ON "workspace_stage_gates" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "workspace_stage_gates_ws_stage_idx" ON "workspace_stage_gates" USING btree ("workspace_id","stage_key");--> statement-breakpoint
-- RLS: stage gates + their per-item completions are visible/editable only to
-- members of their workspace (mirrors workspace_statuses in 0024). Admin-only
-- writes to the gate templates are enforced in the /api/v1 layer, not here;
-- any member may toggle their items' completions.
ALTER TABLE "workspace_stage_gates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY workspace_stage_gates_member_all ON "workspace_stage_gates"
  FOR ALL USING (specboard_is_member(workspace_id))
  WITH CHECK (specboard_is_member(workspace_id));--> statement-breakpoint
ALTER TABLE "feature_gate_completions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY feature_gate_completions_member_all ON "feature_gate_completions"
  FOR ALL USING (specboard_is_member(workspace_id))
  WITH CHECK (specboard_is_member(workspace_id));