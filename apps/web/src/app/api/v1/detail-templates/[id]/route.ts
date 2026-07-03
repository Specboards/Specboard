import { authorizeOrgAdmin } from "@/lib/auth-session";
import {
  InvalidPatchError,
  deleteDetailTemplate,
  parseDetailTemplatePatch,
  updateDetailTemplate,
} from "@/lib/features-service";
import { revalidateCardPages } from "@/lib/revalidate-cards";
import { DetailTemplateError } from "@/lib/store/types";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/v1/detail-templates/:id — update a detail template's name/body.
 * Admin-only.
 */
export async function PATCH(req: Request, { params }: Params) {
  const authz = await authorizeOrgAdmin(req);
  if (!authz.ok) return authz.response;

  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  try {
    const template = await updateDetailTemplate(
      id,
      parseDetailTemplatePatch(body),
      authz.scope ?? undefined,
    );
    revalidateCardPages();
    return Response.json({ template });
  } catch (err) {
    if (err instanceof InvalidPatchError || err instanceof DetailTemplateError) {
      return Response.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}

/**
 * DELETE /api/v1/detail-templates/:id — remove a detail template. Levels that
 * pointed at it fall back to a blank body. Admin-only.
 */
export async function DELETE(req: Request, { params }: Params) {
  const authz = await authorizeOrgAdmin(req);
  if (!authz.ok) return authz.response;

  const { id } = await params;
  try {
    await deleteDetailTemplate(id, authz.scope ?? undefined);
    revalidateCardPages();
    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof DetailTemplateError) {
      return Response.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}
