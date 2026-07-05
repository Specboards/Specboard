import { WebhooksCard } from "@/components/webhooks-card";
import { getDb } from "@/lib/db";
import { listProducts } from "@/lib/products-service";
import { listWebhookEndpoints } from "@/lib/webhooks-service";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

export const dynamic = "force-dynamic";

/**
 * Outbound webhooks: register HTTPS endpoints that receive a signed POST when
 * items and releases change. Admin-only management; unavailable in local file
 * mode (webhooks need a database and a running server). The signing secret is
 * shown once, at creation.
 */
export default async function WebhooksSettingsPage() {
  const access = await requireWorkspaceAccess();
  const db = getDb();

  if (!access || !db) {
    return (
      <p className="text-sm text-muted-foreground">
        Webhooks are unavailable in local file mode.
      </p>
    );
  }
  if (access.role !== "admin") {
    return (
      <p className="text-sm text-muted-foreground">
        Only an organization admin can manage webhooks.
      </p>
    );
  }

  const [endpoints, products] = await Promise.all([
    listWebhookEndpoints(db, access.workspaceId),
    listProducts(access),
  ]);

  return (
    <WebhooksCard
      initialEndpoints={endpoints}
      products={products.map((p) => ({ id: p.id, name: p.name }))}
    />
  );
}
