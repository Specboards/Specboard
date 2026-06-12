import { getAuth } from "@/lib/auth";

async function handler(req: Request) {
  const auth = getAuth();
  if (!auth) {
    return Response.json(
      { error: "Auth is disabled. Set DATABASE_URL and BETTER_AUTH_SECRET to enable it." },
      { status: 501 },
    );
  }
  return auth.handler(req);
}

export { handler as GET, handler as POST };
