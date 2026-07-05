import { authorizeOrgAdmin } from "@/lib/auth-session";
import { getDb } from "@/lib/db";
import { listWebhookDeliveries } from "@/lib/webhooks-service";

export const dynamic = "force-dynamic";

const NO_DB = Response.json(
  { error: "Webhooks require a database (unavailable in local file mode)." },
  { status: 501 },
);

/** GET /api/v1/webhooks/:id/deliveries — recent deliveries for an endpoint. Admin-only. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authz = await authorizeOrgAdmin(req);
  if (!authz.ok) return authz.response;
  const db = getDb();
  if (!db || !authz.scope) return NO_DB;
  const { id } = await params;

  const deliveries = await listWebhookDeliveries(db, authz.scope.workspaceId, id);
  if (deliveries === null) {
    return Response.json({ error: "Endpoint not found." }, { status: 404 });
  }
  return Response.json({ deliveries });
}
