"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import type { EstimateConfig, RepoConfig, StatusWorkflow } from "@specboard/core";

import { AuthRequiredError, patchFeature } from "@/lib/api-client";
import { CUSTOM_FIELD_PREFIX, isFieldAvailable } from "@/lib/card-fields";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { statusLabel, statusOptions } from "@/lib/feature-helpers";
import type { CustomFieldValue, FeatureDetail } from "@/lib/store/types";
import type { WorkspaceMember } from "@/lib/workspace";

type FieldDef = RepoConfig["fields"][number];

/**
 * Metadata form; saves through the public /api/v1 surface. Saves are
 * automatic: selects commit on change, text inputs debounce and commit on
 * blur. There is no manual save button.
 */
export function FeatureMetaForm({
  feature,
  members = [],
  customFields = [],
  candidates = [],
  estimate,
  workflow,
  canEdit = true,
  availableFields = null,
}: {
  feature: FeatureDetail;
  members?: WorkspaceMember[];
  customFields?: FieldDef[];
  /** Other features that can be picked as this one's parent (excludes self). */
  candidates?: { specId: string; title: string }[];
  /** Effort scale + label for the estimate select. */
  estimate: EstimateConfig;
  /** Workspace status workflow (custom statuses/transitions); default if omitted. */
  workflow?: StatusWorkflow;
  canEdit?: boolean;
  /** Metadata field keys available at this item's level; null = all. */
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
  const visibleCustomFields = customFields.filter((f) =>
    show(`${CUSTOM_FIELD_PREFIX}${f.key}`),
  );

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
    const rawPriority = String(data.get("priority") ?? "");
    const rawEstimate = String(data.get("estimate") ?? "");
    try {
      await patchFeature(feature.specId, {
        status: String(data.get("status") ?? feature.status),
        ...(show("priority")
          ? { priority: rawPriority === "" ? null : Number(rawPriority) }
          : {}),
        ...(show("estimate")
          ? { estimate: rawEstimate === "" ? null : Number(rawEstimate) }
          : {}),
        ...(show("quarter")
          ? {
              roadmapQuarter:
                String(data.get("roadmapQuarter") ?? "").trim() || null,
            }
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
        ...(candidates.length > 0
          ? { parentSpecId: String(data.get("parentSpecId") ?? "") || null }
          : {}),
        ...(customFields.length > 0
          ? {
              customFields: collectCustomFields(
                visibleCustomFields,
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
      {candidates.length > 0 ? (
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Parent
          </span>
          <Select
            name="parentSpecId"
            defaultValue={feature.parentSpecId ?? ""}
            className="h-8"
          >
            <option value="">None</option>
            {candidates.map((c) => (
              <option key={c.specId} value={c.specId}>
                {c.title}
              </option>
            ))}
          </Select>
        </label>
      ) : null}
      {show("priority") ? (
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Priority (0 = highest)
          </span>
          <Input
            name="priority"
            type="number"
            min={0}
            max={4}
            defaultValue={feature.priority ?? ""}
            className="h-8"
          />
        </label>
      ) : null}
      {show("estimate") ? (
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            {estimate.label}
          </span>
          <Select
            name="estimate"
            defaultValue={feature.estimate ?? ""}
            className="h-8"
          >
            <option value="">—</option>
            {estimate.scale.map((points) => (
              <option key={points} value={points}>
                {points}
              </option>
            ))}
          </Select>
          {feature.childCount > 0 && feature.rolledEstimate !== null ? (
            <span className="text-[11px] text-muted-foreground">
              Subtree total: {feature.rolledEstimate}
            </span>
          ) : null}
        </label>
      ) : null}
      {show("quarter") ? (
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Roadmap quarter
          </span>
          <Input
            name="roadmapQuarter"
            placeholder="2026-Q3"
            defaultValue={feature.roadmapQuarter ?? ""}
            className="h-8"
          />
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
      {visibleCustomFields.map((field) => (
        <label key={field.key} className="block space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            {field.label}
          </span>
          <CustomFieldInput
            field={field}
            value={feature.customFields[field.key] ?? null}
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

/** Form control for one custom field, keyed `cf:<key>` in the submitted form. */
function CustomFieldInput({
  field,
  value,
  members,
}: {
  field: FieldDef;
  value: CustomFieldValue;
  members: WorkspaceMember[];
}) {
  const name = `cf:${field.key}`;

  if (field.type === "select" || field.type === "user") {
    const options =
      field.type === "user"
        ? members.map((m) => ({ value: m.userId, label: m.name }))
        : (field.options ?? []).map((o) => ({ value: o, label: o }));
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

  if (field.type === "number") {
    return (
      <Input
        name={name}
        type="number"
        defaultValue={typeof value === "number" ? value : ""}
        className="h-8"
      />
    );
  }

  if (field.type === "date") {
    return <Input name={name} type="date" defaultValue={asString(value)} className="h-8" />;
  }

  if (field.type === "multiselect") {
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
 * Read custom-field values out of the form into the patch's customFields map.
 * The server replaces the whole map, so values for fields hidden at this
 * level are carried over from the current record untouched.
 */
function collectCustomFields(
  visibleFields: FieldDef[],
  data: FormData,
  current: Record<string, CustomFieldValue>,
): Record<string, CustomFieldValue> {
  const out: Record<string, CustomFieldValue> = { ...current };
  for (const field of visibleFields) {
    const raw = String(data.get(`cf:${field.key}`) ?? "").trim();
    if (field.type === "number") {
      out[field.key] = raw === "" ? null : Number(raw);
    } else if (field.type === "multiselect") {
      out[field.key] = raw
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
    } else {
      out[field.key] = raw === "" ? null : raw;
    }
  }
  return out;
}
