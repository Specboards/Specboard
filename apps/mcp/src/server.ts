#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { canTransition } from "@specboard/core";
import { createDb, features, workspaces, type Database } from "@specboard/db";

/**
 * SpecBoard MCP server. Gives coding agents a prioritized, status-aware view of
 * specs: they see not just the markdown (canonical in git) but the metadata
 * (status, assignee, priority) layered on top from the DB.
 *
 * Requires DATABASE_URL (the same Postgres the web app uses).
 */
const server = new McpServer({ name: "specboard", version: "0.1.0" });

let dbInstance: Database | undefined;
function db(): Database {
  if (!dbInstance) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "DATABASE_URL is not set. Point it at the SpecBoard Postgres (e.g. postgres://postgres:postgres@localhost:5432/specboard) and seed it with `pnpm --filter @specboard/db seed`.",
      );
    }
    dbInstance = createDb(url);
  }
  return dbInstance;
}

function text(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text:
          typeof value === "string" ? value : JSON.stringify(value, null, 2),
      },
    ],
  };
}

function errorResult(err: unknown) {
  return { isError: true, ...text(`Error: ${(err as Error).message}`) };
}

server.tool(
  "list_features",
  "List features with their metadata, filterable by status/assignee/tag.",
  {
    workspace: z
      .string()
      .describe("Workspace slug (self-host/local default: 'local')"),
    status: z.string().optional(),
    assignee: z.string().optional(),
  },
  async ({ workspace, status, assignee }) => {
    try {
      const ws = await db().query.workspaces.findFirst({
        where: eq(workspaces.slug, workspace),
      });
      if (!ws)
        return errorResult(new Error(`No workspace with slug "${workspace}"`));
      const rows = await db().query.features.findMany({
        where: and(
          eq(features.workspaceId, ws.id),
          ...(status ? [eq(features.status, status)] : []),
          ...(assignee ? [eq(features.assigneeId, assignee)] : []),
        ),
        with: { index: true },
      });
      return text(
        rows
          .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))
          .map((f) => ({
            specId: f.specId,
            title: f.title,
            status: f.status,
            priority: f.priority,
            tags: f.tags,
            roadmapQuarter: f.roadmapQuarter,
            path: f.index?.path,
          })),
      );
    } catch (err) {
      return errorResult(err);
    }
  },
);

server.tool(
  "read_spec",
  "Read a feature's full spec markdown plus its current metadata.",
  { specId: z.string().uuid() },
  async ({ specId }) => {
    try {
      const row = await db().query.features.findFirst({
        where: eq(features.specId, specId),
        with: { index: true },
      });
      if (!row)
        return errorResult(new Error(`No feature with spec id ${specId}`));
      return text({
        specId: row.specId,
        title: row.title,
        status: row.status,
        priority: row.priority,
        tags: row.tags,
        roadmapQuarter: row.roadmapQuarter,
        path: row.index?.path,
        content: row.index?.content ?? "",
      });
    } catch (err) {
      return errorResult(err);
    }
  },
);

server.tool(
  "update_status",
  "Move a feature to a new status (validated against the workflow).",
  { specId: z.string().uuid(), status: z.string() },
  async ({ specId, status }) => {
    try {
      const row = await db().query.features.findFirst({
        where: eq(features.specId, specId),
      });
      if (!row)
        return errorResult(new Error(`No feature with spec id ${specId}`));
      if (!canTransition(row.status, status)) {
        return errorResult(
          new Error(`Illegal transition: ${row.status} -> ${status}`),
        );
      }
      await db()
        .update(features)
        .set({ status, updatedAt: new Date() })
        .where(eq(features.id, row.id));
      return text(`${row.title}: ${row.status} -> ${status}`);
    } catch (err) {
      return errorResult(err);
    }
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("specboard-mcp failed to start:", err);
  process.exit(1);
});
