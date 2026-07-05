import { and, eq, repositories, type Database } from "@specboard/db";

import { resolveRepoClient, type RepoRecord } from "@/lib/github-sync";
import { DocError, type DocSpace } from "@/lib/store/types";

/**
 * GitHub-backed doc spaces (doc_spaces mode `github`): list a docs repo's
 * Markdown files and commit edits back on save. The repo is a `repositories`
 * row created with `isSpecRepo: false` and no config, which keeps it inert to
 * spec sync (the default spec globs never match docs paths, so pushes and
 * scans do no spec work).
 */

/** Every Markdown file in the repo; the UI derives folders from the paths. */
const DOC_GLOBS = ["**/*.md"];

export interface GithubDocFile {
  path: string;
  /** Raw Markdown at the default branch. */
  content: string;
}

export interface GithubDocRepo {
  id: string;
  owner: string;
  name: string;
  defaultBranch: string;
  htmlUrl: string;
}

/** The doc space's backing repositories row, or a DocError when unbound/gone. */
export async function requireDocRepo(
  db: Database,
  workspaceId: string,
  space: DocSpace,
): Promise<RepoRecord> {
  if (space.mode !== "github" || !space.repoId) {
    throw new DocError("This area is not backed by a GitHub repository.");
  }
  const [repo] = await db
    .select()
    .from(repositories)
    .where(
      and(eq(repositories.id, space.repoId), eq(repositories.workspaceId, workspaceId)),
    )
    .limit(1);
  if (!repo) {
    throw new DocError("The docs repository is no longer connected.");
  }
  return repo;
}

/** Load the docs repo and all of its Markdown files (content included). */
export async function loadGithubDocs(
  db: Database,
  workspaceId: string,
  space: DocSpace,
): Promise<{ repo: GithubDocRepo; files: GithubDocFile[] }> {
  const repo = await requireDocRepo(db, workspaceId, space);
  const client = await resolveRepoClient(db, repo);
  const specFiles = await client.listSpecFiles(DOC_GLOBS);
  const files = specFiles
    .map((f) => ({ path: f.path, content: f.raw }))
    .sort((a, b) => a.path.localeCompare(b.path));
  return {
    repo: {
      id: repo.id,
      owner: repo.owner,
      name: repo.name,
      defaultBranch: repo.defaultBranch,
      htmlUrl: `https://github.com/${repo.owner}/${repo.name}`,
    },
    files,
  };
}

/**
 * Validate a repo-relative Markdown path from the client. Rejects traversal,
 * dotfile segments (protects .specboard/ and .github/), and non-.md targets;
 * the commit surface stays "Markdown docs" only.
 */
export function validateDocPath(raw: unknown): string {
  if (typeof raw !== "string" || !raw.trim()) {
    throw new DocError("A file path is required.");
  }
  const path = raw.trim();
  if (path.length > 200) throw new DocError("That path is too long.");
  if (!path.toLowerCase().endsWith(".md")) {
    throw new DocError("Docs are Markdown files (.md).");
  }
  const segments = path.split("/");
  for (const segment of segments) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._ -]*$/.test(segment) || segment === "..") {
      throw new DocError("That path contains unsupported characters.");
    }
  }
  return path;
}

/**
 * Commit one Markdown file to the docs repo's default branch (create or
 * update; the git client resolves which). Returns the new commit sha.
 */
export async function saveGithubDocFile(
  db: Database,
  workspaceId: string,
  space: DocSpace,
  path: string,
  content: string,
): Promise<{ commitSha: string }> {
  const repo = await requireDocRepo(db, workspaceId, space);
  const client = await resolveRepoClient(db, repo);
  const { commitSha } = await client.writeFile({
    path,
    content,
    message: `docs: update ${path}`,
    mode: "direct",
  });
  return { commitSha };
}
