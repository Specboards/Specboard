import type { Workflow } from "./client.js";

/**
 * Shortest legal path from `from` to `to` through the workflow's transitions,
 * as the ordered list of intermediate-and-final statuses to move through
 * (excluding `from`). Returns `[]` when already at the target, or `null` when
 * no legal path exists.
 *
 * `archived` is never used as an intermediate hop (it drops an item off the
 * board, not down the pipeline); it is only ever a destination when `to` is
 * itself `archived`. This is a plain breadth-first search, so the result is a
 * fewest-hops path; ties are broken by transition-declaration order.
 */
export function shortestTransitionPath(
  from: string,
  to: string,
  workflow: Workflow,
): string[] | null {
  if (from === to) return [];
  if (!workflow.statuses.includes(to)) return null;

  const visited = new Set<string>([from]);
  // Queue of (node, path-taken-to-reach-node-excluding-`from`).
  const queue: Array<{ node: string; path: string[] }> = [{ node: from, path: [] }];

  while (queue.length > 0) {
    const { node, path } = queue.shift()!;
    for (const next of workflow.transitions[node] ?? []) {
      if (visited.has(next)) continue;
      // Skip `archived` unless it is the requested destination.
      if (next === "archived" && to !== "archived") continue;
      const nextPath = [...path, next];
      if (next === to) return nextPath;
      visited.add(next);
      queue.push({ node: next, path: nextPath });
    }
  }
  return null;
}
