/**
 * Admin-defined "Details Templates": a named Markdown skeleton that seeds a new
 * card's details. Admins create their own in Settings -> Cards and can assign
 * one per hierarchy level; the built-in examples below give them a starting
 * point to copy or adapt.
 */
export interface DetailTemplate {
  id: string;
  name: string;
  /** Markdown body used as the starting point for a card's details. */
  body: string;
}

/** Fields an admin supplies to create a template (id is assigned by the store). */
export interface DetailTemplateInput {
  name: string;
  body: string;
}

export type DetailTemplatePatch = Partial<{
  name: string;
  body: string;
}>;

/**
 * Ready-made example templates admins can review and adopt without writing
 * their own. These are not stored rows; the UI offers them as starting points
 * that copy into a new custom template.
 */
export interface ExampleDetailTemplate {
  /** Stable key for selecting the example in the UI. */
  key: string;
  name: string;
  body: string;
}

export const EXAMPLE_DETAIL_TEMPLATES: readonly ExampleDetailTemplate[] = [
  {
    key: "feature-spec",
    name: "Feature spec",
    body: [
      "## Problem",
      "",
      "What problem are we solving, and for whom?",
      "",
      "## Proposed solution",
      "",
      "How do we intend to solve it?",
      "",
      "## Out of scope",
      "",
      "- ",
      "",
      "## Open questions",
      "",
      "- ",
      "",
    ].join("\n"),
  },
  {
    key: "bug-report",
    name: "Bug report",
    body: [
      "## Summary",
      "",
      "One-line description of the bug.",
      "",
      "## Steps to reproduce",
      "",
      "1. ",
      "2. ",
      "3. ",
      "",
      "## Expected result",
      "",
      "## Actual result",
      "",
      "## Environment",
      "",
      "- ",
      "",
    ].join("\n"),
  },
  {
    key: "initiative-brief",
    name: "Initiative brief",
    body: [
      "## Goal",
      "",
      "What outcome does this initiative drive?",
      "",
      "## Why now",
      "",
      "## Success metrics",
      "",
      "- ",
      "",
      "## Key results",
      "",
      "- ",
      "",
    ].join("\n"),
  },
];
