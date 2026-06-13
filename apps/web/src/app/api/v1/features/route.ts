import { resolveReadScope } from "@/lib/auth-session";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

/** GET /api/v1/features — list features in the caller's workspace. */
export async function GET(req: Request) {
  const authz = await resolveReadScope(req);
  if (!authz.ok) return authz.response;

  const store = await getStore();
  const features = await store.listFeatures(authz.scope ?? undefined);
  return Response.json({ features });
}
