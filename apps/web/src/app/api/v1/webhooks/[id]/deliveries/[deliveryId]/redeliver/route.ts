import { authorizeOrgAdmin } from "@/lib/auth-session";
import { getDb } from "@/lib/db";
import { redeliverWebhookDelivery } from "@/lib/webhooks-service";

export const dynamic = "force-dynamic";

const NO_DB = Response.json(
  { error: "Webhooks require a database (unavailable in local file mode)." },
  { status: 501 },
);

/**
 * POST /api/v1/webhooks/:id/deliveries/:deliveryId/redeliver — re-queue a past
 * delivery for an immediate resend. Admin-only. The exact stored envelope bytes
 * are re-sent, so the consumer sees the original signature/id and can dedupe.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; deliveryId: string }> },
) {
  const authz = await authorizeOrgAdmin(req);
  if (!authz.ok) return authz.response;
  const db = getDb();
  if (!db || !authz.scope) return NO_DB;
  const { id, deliveryId } = await params;

  const requeued = await redeliverWebhookDelivery(
    db,
    authz.scope.workspaceId,
    id,
    deliveryId,
  );
  if (!requeued) {
    return Response.json({ error: "Delivery not found." }, { status: 404 });
  }
  return Response.json({ ok: true });
}
