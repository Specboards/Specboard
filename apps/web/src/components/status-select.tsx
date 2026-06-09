"use client";

import { useTransition } from "react";

import { updateFeatureStatus } from "@/app/actions";
import { Select } from "@/components/ui/select";
import { statusLabel, statusOptions } from "@/lib/feature-helpers";

/** Inline status mover: only legal workflow transitions are offered. */
export function StatusSelect({
  specId,
  status,
  className,
}: {
  specId: string;
  status: string;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Select
      value={status}
      disabled={pending}
      className={className}
      onChange={(e) => {
        const next = e.target.value;
        startTransition(() => updateFeatureStatus(specId, next));
      }}
    >
      {statusOptions(status).map((s) => (
        <option key={s} value={s}>
          {statusLabel(s)}
        </option>
      ))}
    </Select>
  );
}
