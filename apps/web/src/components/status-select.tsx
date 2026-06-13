"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { AuthRequiredError, patchFeature } from "@/lib/api-client";
import { Select } from "@/components/ui/select";
import { statusLabel, statusOptions } from "@/lib/feature-helpers";

/** Inline status mover: only legal workflow transitions are offered. */
export function StatusSelect({
  specId,
  status,
  className,
  canEdit = true,
}: {
  specId: string;
  status: string;
  className?: string;
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Select
      value={status}
      disabled={pending || !canEdit}
      className={className}
      onChange={(e) => {
        const next = e.target.value;
        startTransition(async () => {
          try {
            await patchFeature(specId, { status: next });
          } catch (err) {
            if (err instanceof AuthRequiredError) {
              router.push(
                `/sign-in?from=${encodeURIComponent(window.location.pathname)}`,
              );
              return;
            }
            // Reverts the optimistic value by re-rendering from the server.
          }
          router.refresh();
        });
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
