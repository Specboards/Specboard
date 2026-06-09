import type { SpecSection } from "@specboard/core";

/** A feature as the UI consumes it: spec identity + PM metadata. */
export interface FeatureRecord {
  /** Stable spec id (frontmatter `id`) — also the route param. */
  specId: string;
  title: string;
  kind?: string;
  status: string;
  priority: number | null;
  tags: string[];
  roadmapQuarter: string | null;
  /** Spec path relative to the repo root. */
  path: string;
}

export interface FeatureDetail extends FeatureRecord {
  /** Spec markdown with frontmatter stripped. */
  content: string;
  sections: SpecSection[];
}

export type FeaturePatch = Partial<
  Pick<FeatureRecord, "status" | "priority" | "tags" | "roadmapQuarter">
>;

/**
 * Storage boundary for the web app. Two implementations:
 * - `local`: reads specs from the filesystem, metadata in a JSON file —
 *   zero-setup local testing.
 * - `db`: Drizzle/Postgres (`DATABASE_URL`) — the real deployment shape.
 */
export interface FeatureStore {
  listFeatures(): Promise<FeatureRecord[]>;
  getFeature(specId: string): Promise<FeatureDetail | null>;
  updateFeature(specId: string, patch: FeaturePatch): Promise<void>;
}
