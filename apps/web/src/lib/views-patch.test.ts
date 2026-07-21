import { describe, expect, it } from "vitest";

import { InvalidViewError, parseSavedViewPatch } from "./views-service";

describe("parseSavedViewPatch", () => {
  it("accepts a name-only patch", () => {
    expect(parseSavedViewPatch({ name: "  My view " })).toEqual({ name: "My view" });
  });

  it("accepts a filters-only patch with known keys", () => {
    expect(parseSavedViewPatch({ filters: { status: "ready" } })).toEqual({
      filters: { status: "ready" },
    });
  });

  it("accepts both name and filters", () => {
    expect(
      parseSavedViewPatch({ name: "Ready work", filters: { status: "ready" } }),
    ).toEqual({ name: "Ready work", filters: { status: "ready" } });
  });

  it("rejects an empty patch", () => {
    expect(() => parseSavedViewPatch({})).toThrow(InvalidViewError);
  });

  it("rejects attempts to change the view list", () => {
    expect(() => parseSavedViewPatch({ view: "roadmap" })).toThrow(
      /view.*cannot be changed/i,
    );
  });

  it("rejects a blank name", () => {
    expect(() => parseSavedViewPatch({ name: "   " })).toThrow(InvalidViewError);
  });

  it("rejects an unknown filter key", () => {
    expect(() => parseSavedViewPatch({ filters: { nonsense: "x" } })).toThrow(
      /Unknown filter key/,
    );
  });

  it("rejects a non-object body", () => {
    expect(() => parseSavedViewPatch(null)).toThrow(InvalidViewError);
    expect(() => parseSavedViewPatch([])).toThrow(InvalidViewError);
  });
});
