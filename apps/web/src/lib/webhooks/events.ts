import { randomUUID } from "node:crypto";

import {
  and,
  eq,
  type Database,
  products,
  users,
  workspaces,
} from "@specboard/db";

import { getDb } from "@/lib/db";
import type { WorkspaceScope } from "@/lib/store/types";
import { drainSoon } from "@/lib/webhooks/drainer";
import {
  endpointsForEvent,
  insertDeliveries,
} from "@/lib/webhooks/store";
import type {
  DomainEvent,
  EventActor,
  WebhookEnvelope,
} from "@/lib/webhooks/types";

/**
 * The single emission seam. The service layer calls this right after a domain
 * write with the tenant scope and a `DomainEvent`; we enrich it into a full
 * envelope, write one `pending` outbox row per subscribed endpoint, and nudge
 * the drainer. Hard rule: this NEVER throws into the caller. A webhook problem
 * (no endpoints, DB hiccup, bad data) must not turn a user's status change into
 * a 500, so the whole body is wrapped and errors are swallowed after logging.
 *
 * Webhooks are DB-only: in local file mode (`scope == null` / no `DATABASE_URL`)
 * this is a no-op. Reads/writes here use the owner connection (`getDb`); the
 * caller already validated the workspace, and this is a system action.
 */
export async function dispatchEvent(
  scope: WorkspaceScope | null | undefined,
  event: DomainEvent,
): Promise<void> {
  try {
    if (!scope) return; // local file mode: webhooks off
    const db = getDb();
    if (!db) return;

    const endpoints = await endpointsForEvent(
      db,
      scope.workspaceId,
      event.type,
      event.productId,
    );
    if (endpoints.length === 0) return;

    const [workspace, product, actor] = await Promise.all([
      loadWorkspace(db, scope.workspaceId),
      event.productId ? loadProduct(db, scope.workspaceId, event.productId) : null,
      loadActor(db, scope.userId),
    ]);
    if (!workspace) return;

    const occurredAt = new Date().toISOString();
    const data = { ...event.data, actor };

    const rows = endpoints.map((ep) => {
      const id = `evt_${randomUUID().replace(/-/g, "")}`;
      const payload: WebhookEnvelope = {
        id,
        type: event.type,
        occurredAt,
        workspace: { id: workspace.id, slug: workspace.slug },
        product,
        data,
      };
      return {
        endpointId: ep.id,
        workspaceId: scope.workspaceId,
        eventId: id,
        eventType: event.type,
        payload,
      };
    });

    await insertDeliveries(db, rows);
    drainSoon(); // opportunistic: deliver now instead of waiting for the interval
  } catch (err) {
    console.error("[webhooks] dispatchEvent failed (ignored):", err);
  }
}

async function loadWorkspace(
  db: Database,
  workspaceId: string,
): Promise<{ id: string; slug: string } | null> {
  const [row] = await db
    .select({ id: workspaces.id, slug: workspaces.slug })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId));
  return row ?? null;
}

async function loadProduct(
  db: Database,
  workspaceId: string,
  productId: string,
): Promise<{ id: string; key: string; name: string } | null> {
  const [row] = await db
    .select({ id: products.id, key: products.key, name: products.name })
    .from(products)
    .where(and(eq(products.id, productId), eq(products.workspaceId, workspaceId)));
  return row ?? null;
}

async function loadActor(db: Database, userId: string): Promise<EventActor> {
  const [row] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.id, userId));
  return row ? { id: row.id, name: row.name } : null;
}
