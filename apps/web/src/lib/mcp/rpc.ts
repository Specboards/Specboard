import { resolveReadAccess } from "@/lib/auth-session";
import { canWrite } from "@/lib/workspace";

import { TOOLS, type McpContext } from "./tools";

/**
 * A minimal, stateless MCP server over the Streamable HTTP transport, spoken as
 * JSON-RPC 2.0 (single messages or batches) with plain `application/json`
 * responses. We implement only what a tools-only server needs - initialize,
 * tools/list, tools/call, ping - which keeps the surface small and dependency
 * free. Auth is the same `sb_` API key the REST API uses, resolved per request.
 */

const PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"] as const;
const SERVER_INFO = { name: "specboard", version: "0.1.0" } as const;
const INSTRUCTIONS =
  "Specboard exposes your product backlog: initiatives, epics, and " +
  "git-backed feature specs, grouped into products. Call whoami first to " +
  "learn your role and the hierarchy levels. Use list_items / read_item to " +
  "review work, update_item to change metadata or a DB-native card's body, " +
  "and create_item to add higher-level cards. Edit an actual spec's Markdown " +
  "with update_spec_content (commits to git), and break a card down by " +
  "creating child specs with create_spec, then update_item(parentSpecId) to " +
  "nest each under the card. To roll changes up, read the child specs and " +
  "write a summary into the parent card with update_item(details).";

export type McpAuth =
  | { ok: true; ctx: McpContext }
  | { ok: false; message: string };

/** Resolve the caller from the request's API key, reusing the REST auth path. */
export async function resolveMcpAuth(req: Request): Promise<McpAuth> {
  const access = await resolveReadAccess(req);
  if (!access.ok) {
    return {
      ok: false,
      message:
        "Authentication required. Provide a Specboard API key as a bearer " +
        "token (Authorization: Bearer sb_...).",
    };
  }
  if (!access.access) {
    // Local file mode (auth disabled): everything allowed with no scope.
    return { ok: true, ctx: { scope: undefined, role: null, isLocal: true } };
  }
  return {
    ok: true,
    ctx: {
      scope: {
        userId: access.access.userId,
        workspaceId: access.access.workspaceId,
      },
      role: access.access.role,
      isLocal: false,
    },
  };
}

function canWriteCtx(ctx: McpContext): boolean {
  return ctx.isLocal || (ctx.role !== null && canWrite(ctx.role));
}

type JsonRpcId = string | number | null;

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

function ok(id: JsonRpcId, result: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, result };
}

export function rpcError(
  id: JsonRpcId,
  code: number,
  message: string,
): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

/** An MCP tool result carrying an execution error (surfaced to the model). */
function toolError(text: string) {
  return { content: [{ type: "text", text: `Error: ${text}` }], isError: true };
}

function initializeResult(params: unknown) {
  const requested = (params as { protocolVersion?: unknown })?.protocolVersion;
  const version =
    typeof requested === "string" &&
    (PROTOCOL_VERSIONS as readonly string[]).includes(requested)
      ? requested
      : PROTOCOL_VERSIONS[0];
  return {
    protocolVersion: version,
    capabilities: { tools: { listChanged: false } },
    serverInfo: SERVER_INFO,
    instructions: INSTRUCTIONS,
  };
}

async function handleToolCall(
  id: JsonRpcId,
  params: unknown,
  auth: McpAuth,
): Promise<JsonRpcResponse> {
  const name = (params as { name?: unknown })?.name;
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) {
    return ok(id, toolError(`Unknown tool: ${String(name)}`));
  }
  if (!auth.ok) {
    return ok(id, toolError(auth.message));
  }
  if (tool.write && !canWriteCtx(auth.ctx)) {
    return ok(
      id,
      toolError("Your role is read-only; this action requires edit access."),
    );
  }
  const rawArgs = (params as { arguments?: unknown })?.arguments;
  const args =
    rawArgs && typeof rawArgs === "object" && !Array.isArray(rawArgs)
      ? (rawArgs as Record<string, unknown>)
      : {};
  try {
    const out = await tool.run(args, auth.ctx);
    return ok(id, {
      content: [
        {
          type: "text",
          text: typeof out === "string" ? out : JSON.stringify(out, null, 2),
        },
      ],
    });
  } catch (err) {
    return ok(id, toolError((err as Error).message));
  }
}

/**
 * Handle one JSON-RPC message. Returns the response, or `null` for
 * notifications (no id) which take no reply.
 */
export async function handleMcpMessage(
  msg: unknown,
  auth: McpAuth,
): Promise<JsonRpcResponse | null> {
  if (
    !msg ||
    typeof msg !== "object" ||
    (msg as { jsonrpc?: unknown }).jsonrpc !== "2.0" ||
    typeof (msg as { method?: unknown }).method !== "string"
  ) {
    const maybeId = (msg as { id?: JsonRpcId } | null)?.id;
    if (maybeId !== undefined && maybeId !== null) {
      return rpcError(maybeId, -32600, "Invalid Request");
    }
    return null;
  }

  const m = msg as { id?: JsonRpcId; method: string; params?: unknown };
  const isNotification = m.id === undefined || m.id === null;
  const id: JsonRpcId = isNotification ? null : m.id!;

  switch (m.method) {
    case "initialize":
      return ok(id, initializeResult(m.params));
    case "ping":
      return ok(id, {});
    case "tools/list":
      return ok(id, {
        tools: TOOLS.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      });
    case "tools/call":
      if (isNotification) return null;
      return handleToolCall(id, m.params, auth);
    default:
      // Notifications (e.g. notifications/initialized) take no reply.
      if (isNotification) return null;
      return rpcError(id, -32601, `Method not found: ${m.method}`);
  }
}
