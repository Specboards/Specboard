import { revalidatePath } from "next/cache";

import { authorizeOrgAdmin, resolveReadScope } from "@/lib/auth-session";
import { InvalidPatchError, listLevels, parseLevelsUpdate, updateLevels } from "@/lib/features-service";
import { LevelError } from "@/lib/store/types";

export const dynamic = "force-dynamic";

/** GET /api/v1/levels — the caller workspace's hierarchy levels (top → leaf). */
export async function GET(req: Request) {
  const authz = await resolveReadScope(req);
  if (!authz.ok) return authz.response;

  const levels = await listLevels(authz.scope ?? undefined);
  return Response.json({ levels });
}

/**
 * PUT /api/v1/levels — replace the workspace's hierarchy configuration.
 * Admin-only (it reshapes every member's board); local file mode is ungated.
 */
export async function PUT(req: Request) {
  const authz = await authorizeOrgAdmin(req);
  if (!authz.ok) return authz.response;
  const scope = authz.scope ?? undefined;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  try {
    const levels = await updateLevels(parseLevelsUpdate(body), scope);
    for (const path of ["/[org]/[product]/backlog", "/[org]/[product]/roadmap", "/[org]/settings/hierarchy"])
      revalidatePath(path, "page");
    return Response.json({ levels });
  } catch (err) {
    if (err instanceof InvalidPatchError || err instanceof LevelError) {
      return Response.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}
