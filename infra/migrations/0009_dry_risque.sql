CREATE TYPE "public"."github_link_kind" AS ENUM('pull_request', 'issue', 'branch');--> statement-breakpoint
CREATE TABLE "feature_github_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"feature_id" uuid NOT NULL,
	"repo_id" uuid NOT NULL,
	"kind" "github_link_kind" NOT NULL,
	"number" integer,
	"branch" text,
	"url" text NOT NULL,
	"title" text,
	"state" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feature_github_links_uq" UNIQUE("feature_id","url")
);
--> statement-breakpoint
ALTER TABLE "feature_github_links" ADD CONSTRAINT "feature_github_links_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_github_links" ADD CONSTRAINT "feature_github_links_feature_id_features_id_fk" FOREIGN KEY ("feature_id") REFERENCES "public"."features"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_github_links" ADD CONSTRAINT "feature_github_links_repo_id_repositories_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feature_github_links_feature_idx" ON "feature_github_links" USING btree ("feature_id");--> statement-breakpoint
CREATE INDEX "feature_github_links_repo_kind_number_idx" ON "feature_github_links" USING btree ("repo_id","kind","number");--> statement-breakpoint
-- RLS: a GitHub link is visible/editable only to members of its workspace
-- (mirrors 0002_rls_policies.sql / 0007 saved_views).
ALTER TABLE "feature_github_links" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY feature_github_links_member_all ON "feature_github_links"
  FOR ALL USING (specboard_is_member(workspace_id))
  WITH CHECK (specboard_is_member(workspace_id));