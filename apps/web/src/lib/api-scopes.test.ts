import { describe, expect, it } from "vitest";

import {
  InvalidScopeError,
  keyScopesSatisfy,
  parseApiScopes,
  requiredScopeFor,
} from "./api-scopes";

describe("parseApiScopes", () => {
  it("accepts an empty/omitted list (full-access key)", () => {
    expect(parseApiScopes(undefined)).toEqual([]);
    expect(parseApiScopes(null)).toEqual([]);
    expect(parseApiScopes([])).toEqual([]);
  });

  it("accepts valid resource:action tokens and the wildcard", () => {
    expect(parseApiScopes(["features:write", "statuses:read"])).toEqual([
      "features:write",
      "statuses:read",
    ]);
    expect(parseApiScopes(["*"])).toEqual(["*"]);
  });

  it("de-duplicates and sorts", () => {
    expect(parseApiScopes(["statuses:read", "features:write", "features:write"])).toEqual([
      "features:write",
      "statuses:read",
    ]);
  });

  it("rejects malformed tokens", () => {
    expect(() => parseApiScopes(["features"])).toThrow(InvalidScopeError);
    expect(() => parseApiScopes(["features:delete"])).toThrow(InvalidScopeError);
    expect(() => parseApiScopes(["Features:read"])).toThrow(InvalidScopeError);
    expect(() => parseApiScopes("features:read")).toThrow(InvalidScopeError);
    expect(() => parseApiScopes([42])).toThrow(InvalidScopeError);
  });
});

describe("requiredScopeFor", () => {
  it("maps read methods to <resource>:read", () => {
    expect(requiredScopeFor("GET", "/api/v1/features")).toEqual({
      resource: "features",
      action: "read",
    });
    expect(requiredScopeFor("GET", "/api/v1/statuses")).toEqual({
      resource: "statuses",
      action: "read",
    });
  });

  it("maps mutating methods to <resource>:write", () => {
    for (const method of ["POST", "PATCH", "PUT", "DELETE"]) {
      expect(requiredScopeFor(method, "/api/v1/features/abc")).toEqual({
        resource: "features",
        action: "write",
      });
    }
  });

  it("uses the first path segment as the resource", () => {
    expect(requiredScopeFor("POST", "/api/v1/features/abc/github-links")).toEqual({
      resource: "features",
      action: "write",
    });
  });

  it("returns null for non-/api/v1 and session-only api-keys paths", () => {
    expect(requiredScopeFor("GET", "/dashboard")).toBeNull();
    expect(requiredScopeFor("POST", "/api/v1/api-keys")).toBeNull();
  });
});

describe("keyScopesSatisfy", () => {
  const read = { resource: "features", action: "read" } as const;
  const write = { resource: "features", action: "write" } as const;

  it("treats an empty grant list as full access (legacy keys)", () => {
    expect(keyScopesSatisfy([], read)).toBe(true);
    expect(keyScopesSatisfy([], write)).toBe(true);
  });

  it("honors the wildcard", () => {
    expect(keyScopesSatisfy(["*"], write)).toBe(true);
  });

  it("write grant satisfies both read and write", () => {
    expect(keyScopesSatisfy(["features:write"], read)).toBe(true);
    expect(keyScopesSatisfy(["features:write"], write)).toBe(true);
  });

  it("read grant satisfies only read", () => {
    expect(keyScopesSatisfy(["features:read"], read)).toBe(true);
    expect(keyScopesSatisfy(["features:read"], write)).toBe(false);
  });

  it("a grant on another resource does not leak", () => {
    expect(keyScopesSatisfy(["releases:write"], write)).toBe(false);
    expect(keyScopesSatisfy(["releases:write"], read)).toBe(false);
  });
});
