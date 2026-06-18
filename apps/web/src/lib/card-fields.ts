import type { BoardPreferences } from "@/lib/store/types";

/**
 * Catalog of fields a board card can display. Built-in keys are fixed; custom
 * fields (from RepoConfig.fields) contribute keys prefixed `cf:`. Shared by the
 * board (server render), the card component, and the customize menu (client).
 */
export interface CardFieldDef {
  key: string;
  label: string;
}

export const CUSTOM_FIELD_PREFIX = "cf:";

/** Built-in card fields, in their default display order. */
export const BUILTIN_CARD_FIELDS: CardFieldDef[] = [
  { key: "priority", label: "Priority" },
  { key: "estimate", label: "Estimate" },
  { key: "assignee", label: "Assignee" },
  { key: "blocked", label: "Blocked badge" },
  { key: "epic", label: "Epic progress" },
  { key: "sub", label: "Sub-feature badge" },
  { key: "tags", label: "Tags" },
  { key: "quarter", label: "Roadmap quarter" },
];

/** Fields shown when a user hasn't customized (matches the original board). */
export const DEFAULT_CARD_FIELDS = [
  "priority",
  "estimate",
  "blocked",
  "epic",
  "sub",
  "tags",
];

const BUILTIN_KEYS = new Set(BUILTIN_CARD_FIELDS.map((f) => f.key));

/** The full set of selectable fields, including the workspace's custom fields. */
export function cardFieldCatalog(
  customFields: { key: string; label: string }[],
): CardFieldDef[] {
  return [
    ...BUILTIN_CARD_FIELDS,
    ...customFields.map((f) => ({
      key: `${CUSTOM_FIELD_PREFIX}${f.key}`,
      label: f.label,
    })),
  ];
}

/** Resolve the effective card fields + featured field from saved preferences. */
export function resolveCardFields(
  prefs: BoardPreferences | null,
  catalog: CardFieldDef[],
): { fields: string[]; featured: string | null } {
  const known = new Set(catalog.map((f) => f.key));
  const chosen = prefs?.cardFields ?? DEFAULT_CARD_FIELDS;
  // Drop keys no longer in the catalog (e.g. a removed custom field).
  return {
    fields: chosen.filter((k) => known.has(k)),
    featured: prefs?.featured ?? null,
  };
}

/** Whether a field key is one of the built-ins (vs a `cf:` custom field). */
export function isBuiltinCardField(key: string): boolean {
  return BUILTIN_KEYS.has(key);
}
