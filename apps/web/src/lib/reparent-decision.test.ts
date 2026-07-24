import { describe, expect, it } from "vitest";

import { decideReparent, type ParentSetBy } from "./github-sync";

/**
 * decideReparent is the crux of gh-51: it decides whether a re-sync re-homes a
 * spec after its `feature:` frontmatter changed, without clobbering a parent set
 * by hand. These cases map directly to the card's acceptance criteria.
 */
function row(
  parentId: string | null,
  parentSetBy: ParentSetBy,
  syncedFeatureKey: string | null,
) {
  return { parentId, parentSetBy, syncedFeatureKey };
}

describe("decideReparent", () => {
  it("homes a never-parented spec (first import)", () => {
    expect(decideReparent(row(null, null, null), "feature:auth").kind).toBe(
      "home",
    );
  });

  it("re-homes a system parent when the grouping key changed", () => {
    expect(
      decideReparent(row("p1", "system", "feature:auth"), "feature:login").kind,
    ).toBe("rehome");
  });

  it("leaves a user-set parent when the grouping key changed", () => {
    expect(
      decideReparent(row("p1", "user", "feature:auth"), "feature:login").kind,
    ).toBe("override");
  });

  it("does nothing when the key is unchanged", () => {
    expect(
      decideReparent(row("p1", "system", "feature:auth"), "feature:auth").kind,
    ).toBe("noop");
    expect(
      decideReparent(row("p1", "user", "feature:auth"), "feature:auth").kind,
    ).toBe("noop");
  });

  it("records a baseline for a backfilled system row with no tracked key", () => {
    expect(
      decideReparent(row("p1", "system", null), "feature:auth").kind,
    ).toBe("baseline");
  });

  it("does not re-home a user-set parent that has no tracked key", () => {
    // A user row whose key was never recorded: we must not touch it, and we do
    // not record a baseline for it either (only system rows get baselined).
    expect(decideReparent(row("p1", "user", null), "feature:auth").kind).toBe(
      "noop",
    );
  });

  it("keeps a deliberately unparented item in Unassigned", () => {
    // parentId null but user-owned: the person detached it; sync leaves it.
    expect(decideReparent(row(null, "user", "feature:auth"), "path:specs/x").kind).toBe(
      "noop",
    );
  });
});
