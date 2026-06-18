import { createHmac, timingSafeEqual } from "node:crypto";

import picomatch from "picomatch";

/** A normalized push event the sync engine cares about. */
export interface PushEvent {
  owner: string;
  name: string;
  /** Branch name with `refs/heads/` stripped. */
  ref: string;
  /** Paths added/modified/removed in the push. */
  changedPaths: string[];
}

/**
 * Verify a GitHub webhook HMAC signature (the `X-Hub-Signature-256` header,
 * formatted `sha256=<hex>`) against the App's webhook secret. Constant-time to
 * avoid leaking the expected digest. `payload` MUST be the exact raw request
 * body — re-serializing parsed JSON changes the bytes and breaks the HMAC.
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  if (!signature || !secret) return false;
  const expected = `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on length mismatch, so guard it (the length check
  // is not itself secret — both are fixed-width hex digests).
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Compile globs into a reusable matcher (avoids recompiling per path). */
export function compileGlobs(globs: string[]): (path: string) => boolean {
  if (globs.length === 0) return () => false;
  return picomatch(globs);
}

/** True if `path` matches any of `globs`. */
export function matchesAnyGlob(path: string, globs: string[]): boolean {
  return compileGlobs(globs)(path);
}

/**
 * Decide which connected specs a push affects so the caller can re-parse only
 * those files and update `spec_index` (using `blobSha` to detect drift).
 */
export function affectedSpecs(event: PushEvent, globs: string[]): string[] {
  const matches = compileGlobs(globs);
  return event.changedPaths.filter((path) => matches(path));
}

/** Shape of the slice of a GitHub push webhook payload we read. */
interface GitHubPushPayload {
  ref?: string;
  repository?: {
    name?: string;
    owner?: { login?: string; name?: string };
  };
  commits?: Array<{ added?: string[]; removed?: string[]; modified?: string[] }>;
}

/**
 * Normalize a GitHub push webhook payload into a {@link PushEvent}. Returns
 * `null` for events we can't act on (non-branch refs, or missing repo coords).
 * `changedPaths` is the de-duplicated union of added/removed/modified across
 * every commit in the push.
 */
export function parsePushEvent(payload: unknown): PushEvent | null {
  const body = payload as GitHubPushPayload;
  const ref = body.ref;
  if (typeof ref !== "string" || !ref.startsWith("refs/heads/")) return null;

  const owner = body.repository?.owner?.login ?? body.repository?.owner?.name;
  const name = body.repository?.name;
  if (!owner || !name) return null;

  const changed = new Set<string>();
  for (const commit of body.commits ?? []) {
    for (const path of [...(commit.added ?? []), ...(commit.removed ?? []), ...(commit.modified ?? [])]) {
      changed.add(path);
    }
  }

  return {
    owner,
    name,
    ref: ref.slice("refs/heads/".length),
    changedPaths: [...changed],
  };
}

/** A normalized pull_request / issues webhook event for link state updates. */
export interface GithubEntityEvent {
  owner: string;
  name: string;
  kind: "pull_request" | "issue";
  number: number;
  /** open / closed / merged. */
  state: string;
  title: string | null;
}

/** Shape of the slice of a pull_request / issues webhook payload we read. */
interface GitHubEntityPayload {
  repository?: { name?: string; owner?: { login?: string; name?: string } };
  pull_request?: { number?: number; state?: string; merged?: boolean; title?: string };
  issue?: { number?: number; state?: string; title?: string };
}

function repoCoords(body: GitHubEntityPayload): { owner: string; name: string } | null {
  const owner = body.repository?.owner?.login ?? body.repository?.owner?.name;
  const name = body.repository?.name;
  if (!owner || !name) return null;
  return { owner, name };
}

/**
 * Normalize a `pull_request` webhook payload into a {@link GithubEntityEvent}.
 * A merged PR reports state "closed", so surface "merged" explicitly. Returns
 * `null` when the payload is missing the fields we need.
 */
export function parsePullRequestEvent(payload: unknown): GithubEntityEvent | null {
  const body = payload as GitHubEntityPayload;
  const coords = repoCoords(body);
  const pr = body.pull_request;
  if (!coords || !pr || typeof pr.number !== "number" || typeof pr.state !== "string") {
    return null;
  }
  return {
    ...coords,
    kind: "pull_request",
    number: pr.number,
    state: pr.merged ? "merged" : pr.state,
    title: pr.title ?? null,
  };
}

/** Normalize an `issues` webhook payload into a {@link GithubEntityEvent}. */
export function parseIssuesEvent(payload: unknown): GithubEntityEvent | null {
  const body = payload as GitHubEntityPayload;
  const coords = repoCoords(body);
  const issue = body.issue;
  if (!coords || !issue || typeof issue.number !== "number" || typeof issue.state !== "string") {
    return null;
  }
  return {
    ...coords,
    kind: "issue",
    number: issue.number,
    state: issue.state,
    title: issue.title ?? null,
  };
}
