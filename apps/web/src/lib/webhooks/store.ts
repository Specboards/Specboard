import {
  and,
  desc,
  eq,
  sql,
  type Database,
  webhookDeliveries,
  webhookEndpoints,
} from "@specboard/db";

import { encryptSecret } from "@/lib/crypto";
import {
  WEBHOOK_FAILURE_DISABLE_THRESHOLD,
  type WebhookEnvelope,
} from "@/lib/webhooks/types";

/**
 * Data access for outbound webhooks. Standalone (like `api-keys.ts`), taking a
 * raw `Database`: endpoint CRUD runs on the request connection, while the
 * delivery drainer runs on the owner connection since it spans every workspace.
 * The signing `secret` is stored `encryptSecret`'d (two-way, reused to sign) and
 * never returned by the list/summary reads.
 */

/** Endpoint view for the settings UI: everything except the signing secret. */
export type WebhookEndpointSummary = {
  id: string;
  url: string;
  productId: string | null;
  eventTypes: string[];
  description: string | null;
  active: boolean;
  /** Consecutive failed deliveries; drives the "auto-disabled" UI state. */
  consecutiveFailures: number;
  createdAt: string;
  updatedAt: string;
};

function toSummary(row: typeof webhookEndpoints.$inferSelect): WebhookEndpointSummary {
  return {
    id: row.id,
    url: row.url,
    productId: row.productId,
    eventTypes: row.eventTypes,
    description: row.description,
    active: row.active,
    consecutiveFailures: row.consecutiveFailures,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listEndpoints(
  db: Database,
  workspaceId: string,
): Promise<WebhookEndpointSummary[]> {
  const rows = await db
    .select()
    .from(webhookEndpoints)
    .where(eq(webhookEndpoints.workspaceId, workspaceId))
    .orderBy(desc(webhookEndpoints.createdAt));
  return rows.map(toSummary);
}

export async function createEndpoint(
  db: Database,
  input: {
    workspaceId: string;
    productId: string | null;
    url: string;
    /** Plaintext signing secret; encrypted here, shown to the admin once by the caller. */
    secret: string;
    eventTypes: string[];
    description: string | null;
  },
): Promise<WebhookEndpointSummary> {
  const [row] = await db
    .insert(webhookEndpoints)
    .values({
      workspaceId: input.workspaceId,
      productId: input.productId,
      url: input.url,
      secret: encryptSecret(input.secret),
      eventTypes: input.eventTypes,
      description: input.description,
    })
    .returning();
  return toSummary(row!);
}

export async function updateEndpoint(
  db: Database,
  workspaceId: string,
  id: string,
  patch: {
    active?: boolean;
    eventTypes?: string[];
    description?: string | null;
    url?: string;
    productId?: string | null;
  },
): Promise<WebhookEndpointSummary | null> {
  const set: Partial<typeof webhookEndpoints.$inferInsert> = { updatedAt: new Date() };
  if (patch.active !== undefined) {
    set.active = patch.active;
    // Manually resuming an endpoint clears any auto-disable streak.
    if (patch.active === true) set.consecutiveFailures = 0;
  }
  if (patch.eventTypes !== undefined) set.eventTypes = patch.eventTypes;
  if (patch.description !== undefined) set.description = patch.description;
  if (patch.url !== undefined) set.url = patch.url;
  if (patch.productId !== undefined) set.productId = patch.productId;

  const [row] = await db
    .update(webhookEndpoints)
    .set(set)
    .where(
      and(
        eq(webhookEndpoints.id, id),
        eq(webhookEndpoints.workspaceId, workspaceId),
      ),
    )
    .returning();
  return row ? toSummary(row) : null;
}

export async function deleteEndpoint(
  db: Database,
  workspaceId: string,
  id: string,
): Promise<boolean> {
  const rows = await db
    .delete(webhookEndpoints)
    .where(
      and(
        eq(webhookEndpoints.id, id),
        eq(webhookEndpoints.workspaceId, workspaceId),
      ),
    )
    .returning({ id: webhookEndpoints.id });
  return rows.length > 0;
}

/** The full endpoint row (incl. encrypted secret), scoped to a workspace. */
export async function getEndpoint(
  db: Database,
  workspaceId: string,
  id: string,
): Promise<typeof webhookEndpoints.$inferSelect | null> {
  const [row] = await db
    .select()
    .from(webhookEndpoints)
    .where(
      and(
        eq(webhookEndpoints.id, id),
        eq(webhookEndpoints.workspaceId, workspaceId),
      ),
    );
  return row ?? null;
}

/**
 * The delivery target for a claimed row: the endpoint's URL, encrypted secret,
 * and active flag. Not workspace-scoped because the drainer is a system process
 * that already holds the delivery row (whose endpoint FK cascade-deletes with
 * the endpoint, so a present row implies a present endpoint).
 */
export async function endpointDeliveryTarget(
  db: Database,
  endpointId: string,
): Promise<{ url: string; secret: string; active: boolean } | null> {
  const [row] = await db
    .select({
      url: webhookEndpoints.url,
      secret: webhookEndpoints.secret,
      active: webhookEndpoints.active,
    })
    .from(webhookEndpoints)
    .where(eq(webhookEndpoints.id, endpointId));
  return row ?? null;
}

/** A delivery row for the settings delivery-log UI (no payload/secret material). */
export type WebhookDeliverySummary = {
  id: string;
  eventId: string;
  eventType: string;
  status: string;
  attempts: number;
  nextAttemptAt: string | null;
  lastStatusCode: number | null;
  lastError: string | null;
  createdAt: string;
};

/**
 * Recent deliveries for one endpoint, newest first. Workspace-scoped (runs on
 * the request connection under RLS, and filtered explicitly) so a member can
 * only read their own workspace's log.
 */
export async function listDeliveries(
  db: Database,
  workspaceId: string,
  endpointId: string,
  limit: number,
): Promise<WebhookDeliverySummary[]> {
  const rows = await db
    .select({
      id: webhookDeliveries.id,
      eventId: webhookDeliveries.eventId,
      eventType: webhookDeliveries.eventType,
      status: webhookDeliveries.status,
      attempts: webhookDeliveries.attempts,
      nextAttemptAt: webhookDeliveries.nextAttemptAt,
      lastStatusCode: webhookDeliveries.lastStatusCode,
      lastError: webhookDeliveries.lastError,
      createdAt: webhookDeliveries.createdAt,
    })
    .from(webhookDeliveries)
    .where(
      and(
        eq(webhookDeliveries.endpointId, endpointId),
        eq(webhookDeliveries.workspaceId, workspaceId),
      ),
    )
    .orderBy(desc(webhookDeliveries.createdAt))
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    eventId: r.eventId,
    eventType: r.eventType,
    status: r.status,
    attempts: r.attempts,
    nextAttemptAt: r.nextAttemptAt ? r.nextAttemptAt.toISOString() : null,
    lastStatusCode: r.lastStatusCode,
    lastError: r.lastError,
    createdAt: r.createdAt.toISOString(),
  }));
}

/**
 * Re-queue a delivery for an immediate send: reset it to `pending`, clear the
 * attempt count so it gets the full retry budget again, and make it due now.
 * Scoped to the workspace (and endpoint) so an admin can only redeliver their
 * own rows. Returns false if no matching row was found. The caller kicks the
 * drainer so the resend goes out on the next tick.
 */
export async function requeueDelivery(
  db: Database,
  workspaceId: string,
  endpointId: string,
  deliveryId: string,
): Promise<boolean> {
  const rows = await db
    .update(webhookDeliveries)
    .set({
      status: "pending",
      attempts: 0,
      nextAttemptAt: new Date(),
      lastError: null,
    })
    .where(
      and(
        eq(webhookDeliveries.id, deliveryId),
        eq(webhookDeliveries.endpointId, endpointId),
        eq(webhookDeliveries.workspaceId, workspaceId),
      ),
    )
    .returning({ id: webhookDeliveries.id });
  return rows.length > 0;
}

export type ClaimedDelivery = {
  id: string;
  endpointId: string;
  eventId: string;
  eventType: string;
  payload: WebhookEnvelope;
  attempts: number;
};

/**
 * Lease up to `limit` due deliveries: pick `pending` rows whose `nextAttemptAt`
 * has passed, skip ones another drainer holds (`FOR UPDATE SKIP LOCKED`), bump
 * `attempts`, and push `nextAttemptAt` out by `leaseSeconds` so a crash mid-POST
 * makes the row due again (at-least-once; consumers dedupe on the envelope id).
 * The POST happens outside this short transaction so no HTTP call holds a lock.
 */
export async function claimDueDeliveries(
  db: Database,
  limit: number,
  leaseSeconds: number,
): Promise<ClaimedDelivery[]> {
  // postgres-js `db.execute` resolves to the row list directly (not `{ rows }`).
  const result = await db.execute(sql`
    WITH due AS (
      SELECT id FROM webhook_deliveries
      WHERE status = 'pending' AND next_attempt_at <= now()
      ORDER BY next_attempt_at
      FOR UPDATE SKIP LOCKED
      LIMIT ${limit}
    )
    UPDATE webhook_deliveries d
    SET attempts = d.attempts + 1,
        next_attempt_at = now() + (${leaseSeconds} * interval '1 second')
    FROM due
    WHERE d.id = due.id
    RETURNING d.id, d.endpoint_id, d.event_id, d.event_type, d.payload, d.attempts
  `);
  const rows = result as unknown as Record<string, unknown>[];
  return rows.map((r) => ({
    id: r.id as string,
    endpointId: r.endpoint_id as string,
    eventId: r.event_id as string,
    eventType: r.event_type as string,
    payload: r.payload as WebhookEnvelope,
    attempts: Number(r.attempts),
  }));
}

export async function markDelivered(
  db: Database,
  id: string,
  statusCode: number,
): Promise<void> {
  await db
    .update(webhookDeliveries)
    .set({
      status: "delivered",
      nextAttemptAt: null,
      lastStatusCode: statusCode,
      lastError: null,
    })
    .where(eq(webhookDeliveries.id, id));
}

/** Schedule the next retry (still `pending`), recording why the last try failed. */
export async function markRetry(
  db: Database,
  id: string,
  nextAttemptAt: Date,
  statusCode: number | null,
  error: string,
): Promise<void> {
  await db
    .update(webhookDeliveries)
    .set({
      status: "pending",
      nextAttemptAt,
      lastStatusCode: statusCode,
      lastError: error.slice(0, 500),
    })
    .where(eq(webhookDeliveries.id, id));
}

/**
 * Record one terminal delivery failure against an endpoint's streak, and
 * auto-disable it (`active = false`) once the streak crosses the threshold.
 * Done in a single statement so the increment and the disable decision see the
 * same value. Returns true if this failure tripped the auto-disable.
 */
export async function recordEndpointFailure(
  db: Database,
  endpointId: string,
): Promise<boolean> {
  const threshold = WEBHOOK_FAILURE_DISABLE_THRESHOLD;
  const [row] = await db
    .update(webhookEndpoints)
    .set({
      consecutiveFailures: sql`${webhookEndpoints.consecutiveFailures} + 1`,
      active: sql`case when ${webhookEndpoints.consecutiveFailures} + 1 >= ${threshold} then false else ${webhookEndpoints.active} end`,
      updatedAt: new Date(),
    })
    .where(eq(webhookEndpoints.id, endpointId))
    .returning({
      active: webhookEndpoints.active,
      consecutiveFailures: webhookEndpoints.consecutiveFailures,
    });
  return !!row && !row.active && row.consecutiveFailures >= threshold;
}

/** Clear an endpoint's failure streak after a successful delivery (no-op if already 0). */
export async function resetEndpointFailures(
  db: Database,
  endpointId: string,
): Promise<void> {
  await db
    .update(webhookEndpoints)
    .set({ consecutiveFailures: 0 })
    .where(
      and(
        eq(webhookEndpoints.id, endpointId),
        sql`${webhookEndpoints.consecutiveFailures} > 0`,
      ),
    );
}

/** Give up: mark `failed` after the retry budget is exhausted. */
export async function markFailed(
  db: Database,
  id: string,
  statusCode: number | null,
  error: string,
): Promise<void> {
  await db
    .update(webhookDeliveries)
    .set({
      status: "failed",
      nextAttemptAt: null,
      lastStatusCode: statusCode,
      lastError: error.slice(0, 500),
    })
    .where(eq(webhookDeliveries.id, id));
}

/**
 * Delete up to `limit` outbox events that were processed more than
 * `retentionDays` ago, returning how many were removed. Only *processed* rows
 * are pruned: an old row that's still unprocessed means the relay never handled
 * it (a bug), and is kept for retry/inspection. Filtering on `created_at` reuses
 * the existing index (processed rows are stamped moments after creation, so
 * age-by-created is effectively age-by-processed). Batched so one sweep never
 * takes a long lock.
 */
export async function pruneProcessedOutbox(
  db: Database,
  retentionDays: number,
  limit: number,
): Promise<number> {
  const result = await db.execute(sql`
    DELETE FROM outbox_events
    WHERE id IN (
      SELECT id FROM outbox_events
      WHERE processed_at IS NOT NULL
        AND created_at < now() - (${retentionDays} * interval '1 day')
      ORDER BY created_at
      LIMIT ${limit}
    )
    RETURNING id
  `);
  return (result as unknown as unknown[]).length;
}
