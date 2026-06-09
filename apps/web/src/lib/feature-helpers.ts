import { defaultWorkflow } from "@specboard/core";

import type { FeatureRecord } from "./store/types";

export function statusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

/** Per-status accent for the small dot next to status text. */
export const statusDotClass: Record<string, string> = {
  backlog: "bg-zinc-400",
  defining: "bg-violet-400",
  ready: "bg-blue-400",
  in_progress: "bg-amber-400",
  in_review: "bg-pink-400",
  done: "bg-emerald-400",
  archived: "bg-zinc-300",
};

export function priorityLabel(priority: number | null): string {
  return priority === null ? "—" : `P${priority}`;
}

/** Statuses a feature may move to from `status` (current first, for selects). */
export function statusOptions(status: string): string[] {
  const next = defaultWorkflow.transitions[status] ?? [];
  return [status, ...next.filter((s) => s !== status)];
}

/** Priority ascending (P0 first, unset last), then title. */
export function sortFeatures(features: FeatureRecord[]): FeatureRecord[] {
  return [...features].sort((a, b) => {
    const pa = a.priority ?? Number.MAX_SAFE_INTEGER;
    const pb = b.priority ?? Number.MAX_SAFE_INTEGER;
    if (pa !== pb) return pa - pb;
    return a.title.localeCompare(b.title);
  });
}
