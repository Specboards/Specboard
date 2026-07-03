import { CardsFieldsEditor } from "@/components/cards-fields-editor";
import { PropertiesManager } from "@/components/properties-manager";
import { BUILTIN_METADATA_FIELDS } from "@/lib/card-fields";
import { getStore } from "@/lib/store";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

export const dynamic = "force-dynamic";

/**
 * Cards settings: which built-in fields are available at each hierarchy level
 * (Work Item, Feature, Epic, Initiative, or whatever the workspace
 * configured), plus the workspace's custom properties (Notion-style: label +
 * type + which levels each applies to). Any member sees the configuration;
 * only admins can change it (matching the /api/v1 write gates).
 */
export default async function CardsSettingsPage() {
  const access = await requireWorkspaceAccess();
  const store = await getStore();
  const [levels, properties] = await Promise.all([
    store.listLevels(access ?? undefined),
    store.listProperties(access ?? undefined),
  ]);
  const canEdit = !access || access.role === "admin";

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Cards</h2>
          <p className="text-sm text-muted-foreground">
            Choose which built-in fields are available on cards at each level
            of your hierarchy. Name, status, parent, and release are always
            available.
          </p>
        </div>
        <CardsFieldsEditor
          levels={levels}
          catalog={BUILTIN_METADATA_FIELDS}
          canEdit={canEdit}
        />
      </div>
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight">
            Custom properties
          </h2>
          <p className="text-sm text-muted-foreground">
            Define your own fields and pick which levels they appear on.
            Values are edited on each item.
          </p>
        </div>
        <PropertiesManager
          levels={levels}
          properties={properties}
          canEdit={canEdit}
        />
      </div>
    </div>
  );
}
