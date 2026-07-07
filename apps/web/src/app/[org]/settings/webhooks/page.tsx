import { redirect } from "next/navigation";

import { orgPath } from "@/lib/org-path";
import { currentOrgSlug } from "@/lib/workspace-access";

export const dynamic = "force-dynamic";

/** Webhooks moved under the consolidated Integrations page. */
export default async function WebhooksSettingsPage() {
  redirect(orgPath(await currentOrgSlug(), "/settings/integrations"));
}
