import { generateKeyBetween } from "fractional-indexing";

import { defaultWorkflow, type StatusWorkflow } from "@specboards/core";
import { fallbackStatusDots, statusColors } from "@specboards/ui";

import type { FeatureRecord } from "./store/types";

/**
 * Human label for a status key. Prefers the workflow's explicit label (set by
 * an admin-defined workflow), falling back to a title-cased key so built-in and
 * config-driven statuses read well without any label map.
 */
export function statusLabel(status: string, workflow?: StatusWorkflow): string {
  const custom = workflow?.labels?.[status];
  if (custom) return custom;
  return status.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

/** The fixed RICE impact scale, most to least impactful. */
export const RICE_IMPACT_OPTIONS = [
  { value: 3, label: "Massive (3×)" },
  { value: 2, label: "High (2×)" },
  { value: 1, label: "Medium (1×)" },
  { value: 0.5, label: "Low (0.5×)" },
  { value: 0.25, label: "Minimal (0.25×)" },
] as const;

/** Allowed impact multipliers (for validation). */
export const RICE_IMPACT_VALUES: readonly number[] = RICE_IMPACT_OPTIONS.map(
  (o) => o.value,
);

/** The four RICE inputs on a feature (any may be unset). */
export interface RiceInputs {
  riceReach: number | null;
  riceImpact: number | null;
  riceConfidence: number | null;
  riceEffort: number | null;
}

/**
 * RICE score = Reach × Impact × (Confidence / 100) ÷ Effort. Null unless every
 * input is present and effort is positive, so a partially-filled feature shows
 * no misleading score.
 */
export function computeRiceScore(i: RiceInputs): number | null {
  const { riceReach: r, riceImpact: im, riceConfidence: c, riceEffort: e } = i;
  if (r == null || im == null || c == null || e == null || e <= 0) return null;
  return (r * im * (c / 100)) / e;
}

/** The four inputs plus the derived score, for building a FeatureRecord. */
export function riceFields(i: RiceInputs): RiceInputs & { riceScore: number | null } {
  return { ...i, riceScore: computeRiceScore(i) };
}

/** A RICE score as a compact display string ("—" when unscored). */
export function formatRiceScore(score: number | null): string {
  if (score == null) return "—";
  return score.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

/** Order features by RICE score, highest first; unscored last, then by title. */
export function compareByRiceScore(
  a: Pick<FeatureRecord, "riceScore" | "title">,
  b: Pick<FeatureRecord, "riceScore" | "title">,
): number {
  if (a.riceScore !== b.riceScore) {
    if (a.riceScore == null) return 1;
    if (b.riceScore == null) return -1;
    return b.riceScore - a.riceScore;
  }
  return a.title.localeCompare(b.title);
}

/** The backlog sort modes selectable in the UI. */
export type SortMode = "default" | "rice";

/** Parse an untrusted `sort` search-param value. */
export function parseSortMode(value: string | string[] | undefined): SortMode {
  const v = Array.isArray(value) ? value[0] : value;
  return v === "rice" ? "rice" : "default";
}

/**
 * Dot color (a hex value) for any status: the shared design-system color from
 * `statusColors` when the status is in the default workflow, otherwise a stable
 * color hashed from the status name so custom statuses stay consistent. Render
 * it as a decorative, label-paired swatch via inline `background-color`; the
 * shared token map is the single source both the app and Gesso read from.
 */
export function statusDotColor(status: string): string {
  const known = statusColors[status];
  if (known) return known.dot;
  let hash = 0;
  for (let i = 0; i < status.length; i++) {
    hash = (hash * 31 + status.charCodeAt(i)) >>> 0;
  }
  return fallbackStatusDots[hash % fallbackStatusDots.length] ?? "#9ca3af";
}

/** Statuses a feature may move to from `status` (current first, for selects). */
export function statusOptions(
  status: string,
  workflow: StatusWorkflow = defaultWorkflow,
): string[] {
  const next = workflow.transitions[status] ?? [];
  return [status, ...next.filter((s) => s !== status)];
}

/** Stable default ordering: by title. */
export function sortFeatures(features: FeatureRecord[]): FeatureRecord[] {
  return [...features].sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * Order cards within a board column: manually-ranked cards first (by lexical
 * rank), then unranked cards by title. Cards gain a rank lazily the first
 * time they're dragged, so a fresh board keeps today's ordering and converges
 * on manual order as it's used.
 */
export function sortBoardCards(features: FeatureRecord[]): FeatureRecord[] {
  return [...features].sort((a, b) => {
    if (a.rank !== null && b.rank !== null) return a.rank < b.rank ? -1 : a.rank > b.rank ? 1 : 0;
    if (a.rank !== null) return -1;
    if (b.rank !== null) return 1;
    return a.title.localeCompare(b.title);
  });
}

/**
 * A fractional rank that sorts between `prev` and `next` (either may be null
 * for an open boundary). Used to persist a card's new position after a drag.
 */
export function rankBetween(
  prev: string | null,
  next: string | null,
): string {
  return generateKeyBetween(prev, next);
}
