/**
 * Workspace-defined custom item properties (Settings -> Cards). Admins define
 * a property once (label + type + options) and choose which hierarchy levels
 * it applies to; values are stored per item in `features.custom_fields`,
 * keyed by the property's stable `key`.
 */

export const PROPERTY_TYPES = [
  "text",
  "number",
  "select",
  "multiselect",
  "date",
  "user",
] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];

export function isPropertyType(value: unknown): value is PropertyType {
  return (
    typeof value === "string" &&
    (PROPERTY_TYPES as readonly string[]).includes(value)
  );
}

/** A custom property definition as the UI consumes it. */
export interface PropertyDef {
  /** Row id (uuid in db mode), used to update/delete the definition. */
  id: string;
  /** Stable value key into `features.custom_fields`; derived from the label. */
  key: string;
  label: string;
  type: PropertyType;
  /** Choices for select/multiselect; empty for other types. */
  options: string[];
  /** Level keys the property applies to; null = every level. */
  levels: string[] | null;
  /** Manual ordering in forms and settings; ascending. */
  position: number;
}

/** Whether a property applies to items at `levelKey` (null levels = all). */
export function propertyAppliesToLevel(
  property: Pick<PropertyDef, "levels">,
  levelKey: string,
): boolean {
  return property.levels == null || property.levels.includes(levelKey);
}

/** Derive a stable property key from a label, unique against `taken`. */
export function propertyKeyFromLabel(label: string, taken: Set<string>): string {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "property";
  let key = base;
  let n = 2;
  while (taken.has(key)) key = `${base}_${n++}`;
  return key;
}
