import { eq, users, workspaces } from "@specboards/db";

import { resolveReadAccess } from "@/lib/auth-session";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/me — identity of the caller (session cookie or API key), the
 * workspace they act in, and their role. Lets the CLI confirm a key works
 * (`specboards whoami`) and resolve "my work" by user id. In local file mode
 * (no accounts) it reports `mode: "local"` with null identity.
 */
export async function GET(req: Request) {
  const authz = await resolveReadAccess(req);
  if (!authz.ok) return authz.response;

  const db = getDb();
  if (!authz.access || !db) {
    return Response.json({ mode: "local", user: null, workspace: null, role: null });
  }

  const { userId, workspaceId, role } = authz.access;
  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const [workspace] = await db
    .select({ id: workspaces.id, name: workspaces.name, slug: workspaces.slug })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  return Response.json({
    mode: "workspace",
    user: user ?? null,
    workspace: workspace ?? null,
    role,
  });
}
