import { authorizeOrgAdmin, resolveReadScope } from "@/lib/auth-session";
import {
  InvalidPatchError,
  createProperty,
  listProperties,
  parsePropertyInput,
} from "@/lib/features-service";
import { revalidateCardPages } from "@/lib/revalidate-cards";
import { PropertyError } from "@/lib/store/types";

export const dynamic = "force-dynamic";

/** GET /api/v1/properties — the workspace's custom property definitions. */
export async function GET(req: Request) {
  const authz = await resolveReadScope(req);
  if (!authz.ok) return authz.response;

  const properties = await listProperties(authz.scope ?? undefined);
  return Response.json({ properties });
}

/**
 * POST /api/v1/properties — define a custom property (Settings -> Cards).
 * Body: { label, type, options?, levels? }. Admin-only; local file mode is
 * ungated.
 */
export async function POST(req: Request) {
  const authz = await authorizeOrgAdmin(req);
  if (!authz.ok) return authz.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  try {
    const property = await createProperty(
      parsePropertyInput(body),
      authz.scope ?? undefined,
    );
    revalidateCardPages();
    return Response.json({ property }, { status: 201 });
  } catch (err) {
    if (err instanceof InvalidPatchError || err instanceof PropertyError) {
      return Response.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}
