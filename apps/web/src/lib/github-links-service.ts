import { and, eq, features, repositories } from "@specboards/db";
import {
  createGitHubRepoClient,
  type GithubArtifactMeta,
} from "@specboards/git";

import { getDb } from "@/lib/db";
import { getGithubApp } from "@/lib/github-app";
import { FeatureNotFoundError } from "@/lib/features-service";
import {
  getStore,
  type GithubLink,
  type GithubLinkInput,
  type GithubLinkKind,
  type ResolvedGithubLink,
  type WorkspaceScope,
} from "@/lib/store";

/**
 * Domain operations for GitHub links behind
 * /api/v1/features/:specId/github-links. Resolves the artifact's metadata from
 * GitHub (owner-side, like the sync engine) then persists through the store.
 */

export class InvalidGithubLinkError extends Error {}
export class GithubNotConfiguredError extends Error {}

const KINDS = new Set<GithubLinkKind>(["pull_request", "issue", "branch"]);

/** Parse and validate an untrusted github-link create body. */
export function parseGithubLinkInput(body: unknown): GithubLinkInput {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new InvalidGithubLinkError("Request body must be a JSON object.");
  }
  const raw = body as Record<string, unknown>;
  if (typeof raw.kind !== "string" || !KINDS.has(raw.kind as GithubLinkKind)) {
    throw new InvalidGithubLinkError(
      `kind must be one of: ${[...KINDS].join(", ")}.`,
    );
  }
  const kind = raw.kind as GithubLinkKind;

  if (kind === "branch") {
    if (typeof raw.branch !== "string" || raw.branch.trim() === "") {
      throw new InvalidGithubLinkError("branch must be a non-empty string.");
    }
    return { kind, branch: raw.branch.trim() };
  }

  if (
    typeof raw.number !== "number" ||
    !Number.isInteger(raw.number) ||
    raw.number <= 0
  ) {
    throw new InvalidGithubLinkError(
      `${kind} requires a positive integer number.`,
    );
  }
  return { kind, number: raw.number };
}

/** Look up a feature's repo coordinates (owner-side, filtered by workspace). */
async function resolveFeatureRepo(specId: string, workspaceId: string) {
  const db = getDb();
  if (!db) {
    throw new GithubNotConfiguredError(
      "GitHub linking requires a connected repository.",
    );
  }
  const rows = await db
    .select({
      repoId: repositories.id,
      owner: repositories.owner,
      name: repositories.name,
      defaultBranch: repositories.defaultBranch,
      installationId: repositories.githubInstallationId,
    })
    .from(features)
    .innerJoin(repositories, eq(features.repoId, repositories.id))
    .where(
      and(eq(features.specId, specId), eq(features.workspaceId, workspaceId)),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Resolve a link's GitHub metadata (title/state/url) for caching. */
async function resolveMetadata(
  repo: NonNullable<Awaited<ReturnType<typeof resolveFeatureRepo>>>,
  input: GithubLinkInput,
): Promise<GithubArtifactMeta> {
  const db = getDb()!;
  const app = await getGithubApp(db);
  if (!app) {
    throw new GithubNotConfiguredError("GitHub App is not configured.");
  }
  const client = await createGitHubRepoClient(app, {
    installationId: repo.installationId,
    owner: repo.owner,
    name: repo.name,
    ref: repo.defaultBranch,
  });
  try {
    if (input.kind === "branch") return await client.getBranch(input.branch!);
    if (input.kind === "issue") return await client.getIssue(input.number!);
    return await client.getPullRequest(input.number!);
  } catch (err) {
    if (isNotFound(err)) {
      throw new InvalidGithubLinkError(
        `That ${input.kind.replace("_", " ")} was not found in ${repo.owner}/${repo.name}.`,
      );
    }
    throw err;
  }
}

function isNotFound(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    err.status === 404
  );
}

/** Create a GitHub link on `specId`; returns the feature's refreshed links. */
export async function addFeatureGithubLink(
  specId: string,
  input: GithubLinkInput,
  scope?: WorkspaceScope,
): Promise<GithubLink[]> {
  if (!scope) {
    throw new GithubNotConfiguredError(
      "GitHub linking requires a connected repository.",
    );
  }
  const store = await getStore();
  const feature = await store.getFeature(specId, scope);
  if (!feature) throw new FeatureNotFoundError(specId);

  const repo = await resolveFeatureRepo(specId, scope.workspaceId);
  if (!repo) throw new FeatureNotFoundError(specId);

  const meta = await resolveMetadata(repo, input);
  const resolved: ResolvedGithubLink = {
    repoId: repo.repoId,
    kind: input.kind,
    number: input.kind === "branch" ? null : (input.number ?? null),
    branch: input.kind === "branch" ? (input.branch ?? null) : null,
    url: meta.url,
    title: meta.title,
    state: meta.state,
  };

  await store.addGithubLink(specId, resolved, scope);
  const updated = await store.getFeature(specId, scope);
  return updated?.githubLinks ?? [];
}

/** Remove a GitHub link by id; returns the feature's refreshed links. */
export async function removeFeatureGithubLink(
  specId: string,
  linkId: string,
  scope?: WorkspaceScope,
): Promise<GithubLink[]> {
  const store = await getStore();
  const feature = await store.getFeature(specId, scope);
  if (!feature) throw new FeatureNotFoundError(specId);
  await store.removeGithubLink(specId, linkId, scope);
  const updated = await store.getFeature(specId, scope);
  return updated?.githubLinks ?? [];
}
