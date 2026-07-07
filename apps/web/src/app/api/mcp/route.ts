import { handleMcpMessage, resolveMcpAuth, rpcError } from "@/lib/mcp/rpc";

/**
 * POST /api/mcp - the hosted Model Context Protocol endpoint. Coding agents
 * (Claude Code / Claude Desktop) point a remote MCP server at this URL and
 * authenticate with a personal Specboard API key:
 *
 *   Authorization: Bearer sb_...
 *
 * One endpoint serves both self-host and SaaS. Tools call the same service
 * layer as /api/v1, so auth, the status workflow, and webhooks all match the
 * web app. Transport is stateless Streamable HTTP: a JSON-RPC request (or
 * batch) in, a JSON-RPC response (or batch) out.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json(rpcError(null, -32700, "Parse error"));
  }

  const auth = await resolveMcpAuth(req);
  const messages = Array.isArray(body) ? body : [body];
  const responses = [];
  for (const message of messages) {
    const response = await handleMcpMessage(message, auth);
    if (response) responses.push(response);
  }

  // Notifications only (no responses): acknowledge with 202 and no body.
  if (responses.length === 0) {
    return new Response(null, { status: 202 });
  }
  return Response.json(Array.isArray(body) ? responses : responses[0]);
}

/** SSE server-to-client streaming is unused; the endpoint is POST-only. */
export function GET() {
  return new Response(
    "This is a Specboard MCP endpoint. Connect with an MCP client over POST " +
      "(Streamable HTTP) using an Authorization: Bearer sb_... API key.",
    { status: 405, headers: { Allow: "POST" } },
  );
}

/** Stateless: there is no session to terminate, but answer DELETE cleanly. */
export function DELETE() {
  return new Response(null, { status: 204 });
}
