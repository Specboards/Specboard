/**
 * The default workflow a feature moves through. Teams can override the vocabulary
 * and transitions via `.specboard/config.yml` (see {@link ./config}), but this is
 * the out-of-the-box state machine.
 */
export const DEFAULT_STATUSES = [
  "backlog",
  "defining",
  "ready",
  "in_progress",
  "in_review",
  "done",
  "archived",
] as const;

export type Status = (typeof DEFAULT_STATUSES)[number];

/** Allowed forward/backward transitions for the default workflow. */
const DEFAULT_TRANSITIONS: Record<Status, Status[]> = {
  backlog: ["defining", "archived"],
  defining: ["ready", "backlog", "archived"],
  ready: ["in_progress", "defining", "archived"],
  in_progress: ["in_review", "ready", "archived"],
  in_review: ["done", "in_progress", "archived"],
  done: ["archived", "in_progress"],
  archived: ["backlog"],
};

/** A status workflow: the ordered vocabulary plus its legal transitions. */
export interface StatusWorkflow {
  statuses: readonly string[];
  transitions: Record<string, string[]>;
  /**
   * Display label per status key. Optional: when a key is absent (or `labels`
   * is omitted entirely) callers title-case the key. Admin-defined workflows
   * carry explicit labels so a stage can be renamed without changing its key.
   */
  labels?: Record<string, string>;
}

export const defaultWorkflow: StatusWorkflow = {
  statuses: DEFAULT_STATUSES,
  transitions: DEFAULT_TRANSITIONS,
};

/**
 * Build a {@link StatusWorkflow} from admin-defined stages (ordered). Transitions
 * are open (any stage to any other), matching the config's "omit transitions"
 * rule, and the system `archived` status is appended so items can still be
 * archived and dropped from the board (which hides `archived`). Returns null when
 * there are fewer than two stages, so callers fall back to config/default.
 */
export function workflowFromStages(
  stages: readonly { key: string; label: string }[],
): StatusWorkflow | null {
  if (stages.length < 2) return null;
  const keys = stages.map((s) => s.key);
  const withArchived = [...keys, "archived"];
  const transitions = Object.fromEntries(
    withArchived.map((k) => [k, withArchived.filter((other) => other !== k)]),
  );
  const labels: Record<string, string> = { archived: "Archived" };
  for (const s of stages) labels[s.key] = s.label;
  return { statuses: withArchived, transitions, labels };
}

/** Whether `from -> to` is a legal move in the given workflow. */
export function canTransition(
  from: string,
  to: string,
  workflow: StatusWorkflow = defaultWorkflow,
): boolean {
  if (from === to) return true;
  return workflow.transitions[from]?.includes(to) ?? false;
}

/**
 * Resolve the active {@link StatusWorkflow} from a repo config. A team
 * customizes its statuses/transitions in `.specboard/config.yml`; when that's
 * absent (or under-specified) the {@link defaultWorkflow} applies, so existing
 * data keeps working unchanged. When `statuses` are given but `transitions`
 * are omitted, any status may move to any other (the config's documented
 * "omit to allow any transition" rule).
 */
export function resolveWorkflow(
  config?: {
    statuses?: readonly string[];
    transitions?: Record<string, string[]>;
  } | null,
): StatusWorkflow {
  const statuses = config?.statuses;
  if (!statuses || statuses.length < 2) return defaultWorkflow;
  const transitions =
    config?.transitions ??
    Object.fromEntries(
      statuses.map((s) => [s, statuses.filter((other) => other !== s)]),
    );
  return { statuses: [...statuses], transitions };
}
