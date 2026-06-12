import { describe, expect, it } from "vitest";

import { emailDomain, isBlockedEmailDomain } from "./email-domains.js";

describe("emailDomain", () => {
  it("extracts and lowercases the domain", () => {
    expect(emailDomain("Jane@Example.COM")).toBe("example.com");
  });

  it("uses the last @ (quoted local parts)", () => {
    expect(emailDomain('"a@b"@example.com')).toBe("example.com");
  });

  it("returns null for malformed addresses", () => {
    expect(emailDomain("nope")).toBeNull();
    expect(emailDomain("@example.com")).toBeNull();
    expect(emailDomain("jane@")).toBeNull();
  });
});

describe("isBlockedEmailDomain", () => {
  it("blocks well-known consumer providers", () => {
    expect(isBlockedEmailDomain("jane@gmail.com")).toBe(true);
    expect(isBlockedEmailDomain("jane@outlook.com")).toBe(true);
    expect(isBlockedEmailDomain("jane@yahoo.com")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isBlockedEmailDomain("jane@GMail.Com")).toBe(true);
  });

  it("blocks subdomains of blocked domains", () => {
    expect(isBlockedEmailDomain("jane@mail.gmail.com")).toBe(true);
  });

  it("allows work domains", () => {
    expect(isBlockedEmailDomain("jane@studiopalouse.com")).toBe(false);
    expect(isBlockedEmailDomain("jane@specboard.ai")).toBe(false);
  });

  it("blocks malformed addresses", () => {
    expect(isBlockedEmailDomain("not-an-email")).toBe(true);
  });

  it("accepts a custom blocklist", () => {
    const list = new Set(["example.com"]);
    expect(isBlockedEmailDomain("jane@example.com", list)).toBe(true);
    expect(isBlockedEmailDomain("jane@gmail.com", list)).toBe(false);
  });
});
