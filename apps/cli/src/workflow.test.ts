import { describe, expect, it } from "vitest";

import type { Workflow } from "./client.js";
import { shortestTransitionPath } from "./workflow.js";

// The built-in default workflow, as the server reports it from GET /api/v1/statuses.
const defaultWorkflow: Workflow = {
  statuses: ["backlog", "defining", "ready", "in_progress", "in_review", "done", "archived"],
  transitions: {
    backlog: ["defining", "archived"],
    defining: ["ready", "backlog", "archived"],
    ready: ["in_progress", "defining", "archived"],
    in_progress: ["in_review", "ready", "archived"],
    in_review: ["done", "in_progress", "archived"],
    done: ["archived", "in_progress"],
    archived: ["backlog"],
  },
};

describe("shortestTransitionPath", () => {
  it("returns [] when already at the target", () => {
    expect(shortestTransitionPath("ready", "ready", defaultWorkflow)).toEqual([]);
  });

  it("returns a single hop for a directly-legal move", () => {
    expect(shortestTransitionPath("backlog", "defining", defaultWorkflow)).toEqual(["defining"]);
  });

  it("walks backlog -> in_progress through defining and ready", () => {
    expect(shortestTransitionPath("backlog", "in_progress", defaultWorkflow)).toEqual([
      "defining",
      "ready",
      "in_progress",
    ]);
  });

  it("walks in_progress -> done through in_review", () => {
    expect(shortestTransitionPath("in_progress", "done", defaultWorkflow)).toEqual([
      "in_review",
      "done",
    ]);
  });

  it("never routes through archived to reach a non-archived target", () => {
    const path = shortestTransitionPath("backlog", "done", defaultWorkflow);
    expect(path).not.toBeNull();
    expect(path).not.toContain("archived");
    expect(path).toEqual(["defining", "ready", "in_progress", "in_review", "done"]);
  });

  it("can still reach archived when that is the target", () => {
    expect(shortestTransitionPath("backlog", "archived", defaultWorkflow)).toEqual(["archived"]);
  });

  it("returns null for a status not in the vocabulary", () => {
    expect(shortestTransitionPath("backlog", "nonsense", defaultWorkflow)).toBeNull();
  });

  it("finds the fewest-hops path when a shortcut exists", () => {
    // done -> in_progress is a direct back-edge in the default workflow.
    expect(shortestTransitionPath("done", "in_progress", defaultWorkflow)).toEqual(["in_progress"]);
  });

  it("handles a custom any-to-any workflow (admin stages) in one hop", () => {
    const open: Workflow = {
      statuses: ["todo", "doing", "done", "archived"],
      transitions: {
        todo: ["doing", "done", "archived"],
        doing: ["todo", "done", "archived"],
        done: ["todo", "doing", "archived"],
        archived: ["todo", "doing", "done"],
      },
    };
    expect(shortestTransitionPath("todo", "done", open)).toEqual(["done"]);
  });

  it("returns null when the graph has no path to the target", () => {
    const stuck: Workflow = {
      statuses: ["a", "b", "c"],
      transitions: { a: ["b"], b: ["a"], c: [] },
    };
    expect(shortestTransitionPath("a", "c", stuck)).toBeNull();
  });
});
