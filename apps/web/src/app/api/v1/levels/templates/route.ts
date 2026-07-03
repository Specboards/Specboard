import { authorizeOrgAdmin } from "@/lib/auth-session";
import {
  InvalidPatchError,
  parseLevelTemplatesUpdate,
  updateLevelTemplates,
} from "@/lib/features-service";
import { revalidateCardPages } from "@/lib/revalidate-cards";
import { LevelError } from "@/lib/store/types";

export const dynamic = "force-dynamic";

/**
 * PUT /api/v1/levels/templates — assign a default detail template per
 * hierarchy level (Settings -> Cards). Body: { templates: { [levelKey]:
 * uuid | null } }; null clears the assignment. Admin-only.
 */
export async function PUT(req: Request) {
  const authz = await authorizeOrgAdmin(req);
  if (!authz.ok) return authz.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  try {
    const levels = await updateLevelTemplates(
      parseLevelTemplatesUpdate(body),
      authz.scope ?? undefined,
    );
    revalidateCardPages();
    return Response.json({ levels });
  } catch (err) {
    if (err instanceof InvalidPatchError || err instanceof LevelError) {
      return Response.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}
