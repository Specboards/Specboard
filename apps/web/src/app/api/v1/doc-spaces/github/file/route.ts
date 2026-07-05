import { canWriteProduct } from "@specboard/core";

import { authorizeWrite } from "@/lib/auth-session";
import { getDb } from "@/lib/db";
import { parseDocArea } from "@/lib/docs-service";
import { saveGithubDocFile, validateDocPath } from "@/lib/github-docs";
import { getStore } from "@/lib/store";
import { DocError, ProductError } from "@/lib/store/types";

export const dynamic = "force-dynamic";

/**
 * PUT /api/v1/doc-spaces/github/file: save one Markdown file in a
 * GitHub-backed doc area; the save commits directly to the repo's default
 * branch. Body: { productId, area, path, content }. Creates the file when it
 * doesn't exist yet (a new page) and updates it otherwise.
 */
export async function PUT(req: Request) {
  const authz = await authorizeWrite(req);
  if (!authz.ok) return authz.response;
  const db = getDb();
  if (!db || !authz.scope) {
    return Response.json(
      { error: "GitHub-backed docs need a database-backed deployment." },
      { status: 501 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Request body must be JSON." }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;
  if (typeof b.productId !== "string" || typeof b.content !== "string") {
    return Response.json({ error: "productId and content are required." }, { status: 422 });
  }

  try {
    const area = parseDocArea(b.area);
    const path = validateDocPath(b.path);
    const store = await getStore();
    // getDocSpace enforces product visibility; editing needs product write.
    const space = await store.getDocSpace(b.productId, area, authz.scope);
    const access = await store.getProductAccess(authz.scope);
    if (!access.isOrgAdmin && !canWriteProduct(access, b.productId)) {
      return Response.json(
        { error: "Your role does not permit editing these docs." },
        { status: 403 },
      );
    }
    const { commitSha } = await saveGithubDocFile(
      db,
      authz.scope.workspaceId,
      space,
      path,
      b.content,
    );
    return Response.json({ ok: true, path, commitSha });
  } catch (err) {
    if (err instanceof DocError || err instanceof ProductError) {
      return Response.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}
