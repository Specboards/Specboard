/**
 * Ideas: lightweight capture of feature requests / feedback that teams review
 * and either promote into feature work or park. An idea moves through a small
 * review workflow, separate from the item workflow (`status.ts`): idea stages
 * describe triage (is this worth building?), not delivery. Admins can replace
 * the stage set in Settings -> Ideas; when a workspace has no custom stages,
 * this built-in default applies.
 */

/** One stage of the idea review workflow. */
export interface IdeaStage {
  /** Stable slug stored in `ideas.status` (rename changes only the label). */
  key: string;
  label: string;
  /** Ordering in filters and settings; ascending. */
  position: number;
}

/** The out-of-the-box idea review workflow. */
export const DEFAULT_IDEA_STAGES: readonly IdeaStage[] = [
  { key: "new", label: "New", position: 0 },
  { key: "under_review", label: "Under review", position: 1 },
  { key: "planned", label: "Planned", position: 2 },
  { key: "shipped", label: "Shipped", position: 3 },
  { key: "parked", label: "Parked", position: 4 },
  { key: "declined", label: "Declined", position: 5 },
];

/**
 * The effective idea stages: the admin-defined set when present (two or more
 * stages, mirroring the item-workflow rule), else the built-in default.
 */
export function resolveIdeaStages(
  stages: readonly IdeaStage[],
): readonly IdeaStage[] {
  return stages.length >= 2 ? stages : DEFAULT_IDEA_STAGES;
}

/** Display label for an idea status key (falls back to the key itself). */
export function ideaStatusLabel(
  key: string,
  stages: readonly IdeaStage[],
): string {
  return stages.find((s) => s.key === key)?.label ?? key;
}

/** Whether `key` names a stage in the effective workflow. */
export function isIdeaStatus(
  key: string,
  stages: readonly IdeaStage[],
): boolean {
  return stages.some((s) => s.key === key);
}

/**
 * The status a just-promoted idea should take: `planned` when the effective
 * workflow still has that stage, else the idea's current status (a custom
 * workflow may model promotion differently, so we don't guess).
 */
export function promotedIdeaStatus(
  current: string,
  stages: readonly IdeaStage[],
): string {
  return isIdeaStatus("planned", stages) ? "planned" : current;
}
