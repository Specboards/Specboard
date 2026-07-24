ALTER TABLE "features" ADD COLUMN "parent_set_by" text;--> statement-breakpoint
ALTER TABLE "features" ADD COLUMN "synced_feature_key" text;--> statement-breakpoint
-- Backfill (gh-51): nothing recorded who set a parent before this migration,
-- so treat every existing parent as system-assigned. A manual re-parent done
-- before this ships is therefore re-homable on the next frontmatter change;
-- that trade-off is accepted (see the card).
UPDATE "features" SET "parent_set_by" = 'system' WHERE "parent_id" IS NOT NULL;--> statement-breakpoint
-- Recover the last-synced grouping key from the parent Feature grouping, whose
-- external_key IS that key (sync homed the spec under it). Rows whose parent is
-- a hand-made card (no external_key) keep a NULL key; sync records a baseline
-- for them on the next pass without moving them.
UPDATE "features" AS s
SET "synced_feature_key" = p."external_key"
FROM "features" AS p
WHERE s."parent_id" = p."id" AND p."external_key" IS NOT NULL;