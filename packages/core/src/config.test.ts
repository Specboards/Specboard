import { describe, expect, it } from "vitest";

import { MAX_REPO_CONFIG_LENGTH, parseRepoConfigYaml, safeParseRepoConfig } from "./config.js";

describe("parseRepoConfigYaml", () => {
  it("parses a config.yml with globs and write mode", () => {
    const raw = [
      "version: 1",
      "specGlobs:",
      '  - "specs/**/spec.md"',
      "writeMode: pr",
    ].join("\n");

    const config = parseRepoConfigYaml(raw);
    expect(config.specGlobs).toEqual(["specs/**/spec.md"]);
    expect(config.writeMode).toBe("pr");
  });

  it("applies defaults when optional keys are omitted", () => {
    const config = parseRepoConfigYaml("version: 1");
    expect(config.specGlobs).toEqual(["specs/**/spec.md"]);
    expect(config.writeMode).toBe("pr");
  });

  it("rejects an over-limit document before parsing", () => {
    const raw = "version: 1\n" + "# padding\n".repeat(MAX_REPO_CONFIG_LENGTH / 10 + 1);
    expect(() => parseRepoConfigYaml(raw)).toThrow(/maximum accepted size/);
  });

  it("parses a merge-key chain within the size limit", () => {
    // Anchor/merge-key chains were the quadratic-cost shape in vulnerable
    // js-yaml versions; a within-limit chain must parse quickly and land on
    // the schema like any other document.
    const chain = Array.from(
      { length: 50 },
      (_, i) => `a${i}: &a${i}\n  <<: *a${i - 1}\n  k${i}: v`,
    ).slice(1);
    const raw = ["a0: &a0\n  k0: v", ...chain, "version: 1"].join("\n");
    const config = parseRepoConfigYaml(raw);
    expect(config.writeMode).toBe("pr");
  });

  it("ignores legacy keys (fields/estimate) removed from the schema", () => {
    const raw = [
      "version: 1",
      "fields:",
      "  - key: effort",
      "    label: Effort",
      "    type: select",
      "estimate:",
      "  scale: [1, 2, 3]",
    ].join("\n");
    const config = parseRepoConfigYaml(raw);
    expect("fields" in config).toBe(false);
    expect("estimate" in config).toBe(false);
  });
});

describe("safeParseRepoConfig", () => {
  it("returns null for malformed input instead of throwing", () => {
    expect(safeParseRepoConfig(null)).toBeNull();
    expect(safeParseRepoConfig({ version: 2 })).toBeNull();
  });

  it("returns the parsed config for a valid object", () => {
    const config = safeParseRepoConfig({ version: 1, specGlobs: ["a/**/spec.md"] });
    expect(config?.specGlobs).toEqual(["a/**/spec.md"]);
  });
});
