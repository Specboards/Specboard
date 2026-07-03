import { CardsFieldsEditor } from "@/components/cards-fields-editor";
import { metadataFieldCatalog } from "@/lib/card-fields";
import { resolveRepoConfig } from "@/lib/repo-config";
import { getStore } from "@/lib/store";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

export const dynamic = "force-dynamic";

/**
 * Cards settings: which metadata fields are available at each hierarchy
 * level (Work Item, Feature, Epic, Initiative, or whatever the workspace
 * configured). Any member sees the configuration; only admins can change it
 * (matching PUT /api/v1/levels/fields).
 */
export default async function CardsSettingsPage() {
  const access = await requireWorkspaceAccess();
  const store = await getStore();
  const levels = await store.listLevels(access ?? undefined);
  const repoConfig = await resolveRepoConfig(access);
  const catalog = metadataFieldCatalog(repoConfig?.fields ?? []);
  const canEdit = !access || access.role === "admin";

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold tracking-tight">Cards</h2>
        <p className="text-sm text-muted-foreground">
          Choose which fields are available on cards at each level of your
          hierarchy.
        </p>
      </div>
      <CardsFieldsEditor levels={levels} catalog={catalog} canEdit={canEdit} />
    </div>
  );
}
