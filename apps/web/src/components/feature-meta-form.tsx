"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import type { PropertyDef, StatusWorkflow } from "@specboard/core";

import { AuthRequiredError, patchFeature } from "@/lib/api-client";
import { isFieldAvailable } from "@/lib/card-fields";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { statusLabel, statusOptions } from "@/lib/feature-helpers";
import type {
  CustomFieldValue,
  FeatureDetail,
  ReleaseRecord,
} from "@/lib/store/types";
import type { WorkspaceMember } from "@/lib/workspace";

/**
 * Metadata form; saves through the public /api/v1 surface. Saves are
 * automatic: selects commit on change, text inputs debounce and commit on
 * blur. There is no manual save button. Parent/child hierarchy is edited in
 * the Relationships section, not here.
 */
export function FeatureMetaForm({
  feature,
  members = [],
  properties = [],
  releases = [],
  workflow,
  canEdit = true,
  availableFields = null,
}: {
  feature: FeatureDetail;
  members?: WorkspaceMember[];
  /** Custom properties that apply at this item's level. */
  properties?: PropertyDef[];
  /** The workspace's releases, for the release picker. */
  releases?: ReleaseRecord[];
  /** Workspace status workflow (custom statuses/transitions); default if omitted. */
  workflow?: StatusWorkflow;
  canEdit?: boolean;
  /** Built-in metadata field keys available at this item's level; null = all. */
  availableFields?: string[] | null;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);
  const dirtyRef = useRef(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const show = (key: string) => isFieldAvailable(availableFields, key);

  async function save() {
    const form = formRef.current;
    if (!form) return;
    if (inFlightRef.current) {
      // A save is running; remember to run once more with the latest values.
      dirtyRef.current = true;
      return;
    }
    inFlightRef.current = true;
    setStatus("saving");
    setError(null);

    const data = new FormData(form);
    try {
      await patchFeature(feature.specId, {
        status: String(data.get("status") ?? feature.status),
        ...(releases.length > 0
          ? { releaseId: String(data.get("releaseId") ?? "") || null }
          : {}),
        ...(show("tags")
          ? {
              tags: String(data.get("tags") ?? "")
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean),
            }
          : {}),
        ...(members.length > 0 && show("assignee")
          ? { assigneeId: String(data.get("assigneeId") ?? "") || null }
          : {}),
        ...(properties.length > 0
          ? {
              customFields: collectCustomFields(
                properties,
                data,
                feature.customFields,
              ),
            }
          : {}),
      });
      setStatus("saved");
      router.refresh();
    } catch (err) {
      if (err instanceof AuthRequiredError) {
        router.push(
          `/sign-in?from=${encodeURIComponent(window.location.pathname)}`,
        );
        return;
      }
      setStatus("idle");
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      inFlightRef.current = false;
      if (dirtyRef.current) {
        dirtyRef.current = false;
        void save();
      }
    }
  }

  /** Debounced save: selects commit fast, typing settles before a request. */
  function queueSave(delay: number) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void save(), delay);
  }

  if (!canEdit) {
    return (
      <p className="text-xs text-muted-foreground">
        You have view-only access. Ask an admin for an editor role to change
        metadata.
      </p>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        queueSave(0);
      }}
      onChange={() => queueSave(600)}
      onBlur={() => queueSave(0)}
      className="space-y-3"
    >
      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          Status
        </span>
        <Select name="status" defaultValue={feature.status} className="h-8">
          {statusOptions(feature.status, workflow).map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </Select>
      </label>
      {members.length > 0 && show("assignee") ? (
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Assignee
          </span>
          <Select
            name="assigneeId"
            defaultValue={feature.assigneeId ?? ""}
            className="h-8"
          >
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.name}
              </option>
            ))}
          </Select>
        </label>
      ) : null}
      {releases.length > 0 ? (
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Release
          </span>
          <Select
            name="releaseId"
            defaultValue={feature.releaseId ?? ""}
            className="h-8"
          >
            <option value="">None</option>
            {releases.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        </label>
      ) : null}
      {show("tags") ? (
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Tags (comma-separated)
          </span>
          <Input
            name="tags"
            defaultValue={feature.tags.join(", ")}
            className="h-8"
          />
        </label>
      ) : null}
      {properties.map((property) => (
        <label key={property.key} className="block space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            {property.label}
          </span>
          <CustomFieldInput
            property={property}
            value={feature.customFields[property.key] ?? null}
            members={members}
          />
        </label>
      ))}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <p
        className="h-4 text-[11px] text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : ""}
      </p>
    </form>
  );
}

/** Form control for one custom property, keyed `cf:<key>` in the submitted form. */
function CustomFieldInput({
  property,
  value,
  members,
}: {
  property: PropertyDef;
  value: CustomFieldValue;
  members: WorkspaceMember[];
}) {
  const name = `cf:${property.key}`;

  if (property.type === "select" || property.type === "user") {
    const options =
      property.type === "user"
        ? members.map((m) => ({ value: m.userId, label: m.name }))
        : property.options.map((o) => ({ value: o, label: o }));
    return (
      <Select name={name} defaultValue={asString(value)} className="h-8">
        <option value="">—</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    );
  }

  if (property.type === "number") {
    return (
      <Input
        name={name}
        type="number"
        defaultValue={typeof value === "number" ? value : ""}
        className="h-8"
      />
    );
  }

  if (property.type === "date") {
    return <Input name={name} type="date" defaultValue={asString(value)} className="h-8" />;
  }

  if (property.type === "multiselect") {
    return (
      <Input
        name={name}
        placeholder="comma-separated"
        defaultValue={Array.isArray(value) ? value.join(", ") : ""}
        className="h-8"
      />
    );
  }

  return <Input name={name} defaultValue={asString(value)} className="h-8" />;
}

function asString(value: CustomFieldValue): string {
  return typeof value === "string" ? value : "";
}

/**
 * Read custom-property values out of the form into the patch's customFields
 * map. The server replaces the whole map, so values for properties not shown
 * at this level are carried over from the current record untouched.
 */
function collectCustomFields(
  visibleProperties: PropertyDef[],
  data: FormData,
  current: Record<string, CustomFieldValue>,
): Record<string, CustomFieldValue> {
  const out: Record<string, CustomFieldValue> = { ...current };
  for (const property of visibleProperties) {
    const raw = String(data.get(`cf:${property.key}`) ?? "").trim();
    if (property.type === "number") {
      out[property.key] = raw === "" ? null : Number(raw);
    } else if (property.type === "multiselect") {
      out[property.key] = raw
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
    } else {
      out[property.key] = raw === "" ? null : raw;
    }
  }
  return out;
}
