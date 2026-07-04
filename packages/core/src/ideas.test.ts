import { describe, expect, it } from "vitest";

import {
  DEFAULT_IDEA_STAGES,
  ideaStatusLabel,
  isIdeaStatus,
  promotedIdeaStatus,
  resolveIdeaStages,
  type IdeaStage,
} from "./ideas.js";

const custom: IdeaStage[] = [
  { key: "triage", label: "Triage", position: 0 },
  { key: "accepted", label: "Accepted", position: 1 },
];

describe("resolveIdeaStages", () => {
  it("returns the default set when there are no custom stages", () => {
    expect(resolveIdeaStages([])).toBe(DEFAULT_IDEA_STAGES);
  });

  it("returns the default set when only one custom stage exists", () => {
    expect(resolveIdeaStages([custom[0]!])).toBe(DEFAULT_IDEA_STAGES);
  });

  it("uses the custom set once there are two or more stages", () => {
    expect(resolveIdeaStages(custom)).toBe(custom);
  });
});

describe("ideaStatusLabel", () => {
  it("resolves a known key to its label", () => {
    expect(ideaStatusLabel("under_review", DEFAULT_IDEA_STAGES)).toBe(
      "Under review",
    );
  });

  it("falls back to the key when it is unknown", () => {
    expect(ideaStatusLabel("mystery", DEFAULT_IDEA_STAGES)).toBe("mystery");
  });
});

describe("isIdeaStatus", () => {
  it("is true for a stage in the set", () => {
    expect(isIdeaStatus("planned", DEFAULT_IDEA_STAGES)).toBe(true);
  });
  it("is false for a stage not in the set", () => {
    expect(isIdeaStatus("planned", custom)).toBe(false);
  });
});

describe("promotedIdeaStatus", () => {
  it("moves an idea to planned when the workflow has that stage", () => {
    expect(promotedIdeaStatus("new", DEFAULT_IDEA_STAGES)).toBe("planned");
  });

  it("keeps the current status when there is no planned stage", () => {
    expect(promotedIdeaStatus("triage", custom)).toBe("triage");
  });
});
