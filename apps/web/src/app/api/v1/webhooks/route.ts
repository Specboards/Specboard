import { authorizeOrgAdmin } from "@/lib/auth-session";
import { getDb } from "@/lib/db";
import {
  createWebhookEndpoint,
  listWebhookEndpoints,
  WebhookInputError,
} from "@/lib/webhooks-service";

export const dynamic = "force-dynamic";

/** Webhooks need a database + running server; unavailable in local file mode. */
const NO_DB = Response.json(
  { error: "Webhooks require a database (unavailable in local file mode)." },
  { status: 501 },
);

/** GET /api/v1/webhooks — list the workspace's endpoints (no secrets). Admin-only. */
export async function GET(req: Request) {
  const authz = await authorizeOrgAdmin(req);
  if (!authz.ok) return authz.response;
  const db = getDb();
  if (!db || !authz.scope) return NO_DB;

  const endpoints = await listWebhookEndpoints(db, authz.scope.workspaceId);
  return Response.json({ endpoints });
}

/** POST /api/v1/webhooks — register an endpoint. Returns the secret once. Admin-only. */
export async function POST(req: Request) {
  const authz = await authorizeOrgAdmin(req);
  if (!authz.ok) return authz.response;
  const db = getDb();
  if (!db || !authz.scope) return NO_DB;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  try {
    const created = await createWebhookEndpoint(db, authz.scope.workspaceId, body);
    return Response.json(created, { status: 201 });
  } catch (err) {
    if (err instanceof WebhookInputError) {
      return Response.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}
