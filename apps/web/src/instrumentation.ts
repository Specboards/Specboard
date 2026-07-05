/**
 * Next.js runs this once when the server process boots. We use it to start the
 * in-process webhook outbox drainer (Node runtime only; it uses `setInterval`,
 * `fetch`, DNS, and the DB, none of which belong in the edge runtime). No-op in
 * local file mode, where `startDrainer` finds no database.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startDrainer } = await import("@/lib/webhooks/drainer");
    startDrainer();
  }
}
