import { load } from "js-yaml";
import { z } from "zod";

/**
 * Schema for `.specboards/config.yml`, the per-repo file that tells Specboards
 * where specs live and how this team's workflow is shaped. Kept in the repo so
 * the configuration is versioned with the code, while the resulting metadata
 * still lives in the DB. Custom item properties are NOT configured here: admins
 * define them in Settings -> Cards (see workspace properties).
 */
export const repoConfigSchema = z.object({
  version: z.literal(1),
  /**
   * Glob(s), relative to repo root, that identify spec directories/files. This
   * comes from an untrusted `.specboards/config.yml` in a connected repo and is
   * compiled to a regex and matched against every path in the tree, so bound
   * both the count and each pattern's length to keep a hostile config from
   * driving pathological compile/match cost.
   */
  specGlobs: z
    .array(z.string().max(500))
    .max(100)
    .default(["specs/**/spec.md"]),
  /** Override the default status vocabulary; first entry is the initial state. */
  statuses: z.array(z.string().max(200)).min(2).max(100).optional(),
  /** Legal transitions keyed by status; omit to allow any transition. */
  transitions: z.record(z.string(), z.array(z.string())).optional(),
  /** How UI spec edits are written back to git. */
  writeMode: z.enum(["pr", "direct"]).default("pr"),
});

export type RepoConfig = z.infer<typeof repoConfigSchema>;

export function parseRepoConfig(input: unknown): RepoConfig {
  return repoConfigSchema.parse(input);
}

/**
 * Upper bound on the raw `.specboards/config.yml` text accepted for parsing,
 * in UTF-16 code units (string length; parse cost scales with it). The
 * schema's own limits (glob/status counts and lengths) apply only after YAML
 * parsing completes, so without this a hostile repo could feed the parser an
 * arbitrarily large document and burn CPU during import or webhook sync. A
 * real config is well under 10 KB; 256 K units leave generous room for
 * comments while bounding parse cost.
 */
export const MAX_REPO_CONFIG_LENGTH = 256 * 1024;

/**
 * Parse `.specboards/config.yml` (raw YAML) into a validated {@link RepoConfig}.
 * The file comes from an untrusted connected repo: reject oversized documents
 * before the parser ever sees them.
 */
export function parseRepoConfigYaml(raw: string): RepoConfig {
  if (raw.length > MAX_REPO_CONFIG_LENGTH) {
    throw new Error(
      `.specboards/config.yml exceeds the maximum accepted size of ${MAX_REPO_CONFIG_LENGTH} characters.`,
    );
  }
  return repoConfigSchema.parse(load(raw) ?? {});
}

/**
 * Best-effort parse of a stored/loaded config value into a {@link RepoConfig},
 * returning `null` instead of throwing when it's absent or malformed. Used when
 * surfacing config-driven UI (e.g. custom fields) where a bad config should
 * degrade gracefully rather than break the page.
 */
export function safeParseRepoConfig(input: unknown): RepoConfig | null {
  const result = repoConfigSchema.safeParse(input);
  return result.success ? result.data : null;
}
