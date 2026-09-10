import { describe, it, expect } from "vitest";
import {
  normalizeInstagram,
  tryNormalizeInstagram,
  InvalidInstagramError,
  canonicalInstagramUrl,
} from "@/lib/instagram";

describe("instagram normalization", () => {
  const canonical = "https://www.instagram.com/username/";

  it.each([
    "https://instagram.com/username",
    "https://www.instagram.com/username",
    "https://www.instagram.com/username/",
    "http://instagram.com/username?hl=en",
    "instagram.com/username",
    "www.instagram.com/username/",
    "@username",
    "username",
    "  @username  ",
    "https://www.instagram.com/username/?igsh=abc123",
  ])("normalizes %s", (input) => {
    const r = normalizeInstagram(input);
    expect(r.username).toBe("username");
    expect(r.canonicalUrl).toBe(canonical);
  });

  it("lowercases handles", () => {
    expect(normalizeInstagram("@UserName").username).toBe("username");
  });

  it("keeps dots and underscores", () => {
    expect(normalizeInstagram("nomad.notes_1").username).toBe("nomad.notes_1");
  });

  it("rejects non-instagram urls", () => {
    expect(tryNormalizeInstagram("https://twitter.com/username")).toBeNull();
    expect(tryNormalizeInstagram("https://example.com/username")).toBeNull();
  });

  it("rejects instagram non-profile paths", () => {
    expect(tryNormalizeInstagram("https://instagram.com/p/Cabc123")).toBeNull();
    expect(tryNormalizeInstagram("https://instagram.com/reel/xyz")).toBeNull();
    expect(tryNormalizeInstagram("https://instagram.com/explore/tags/x")).toBeNull();
    expect(tryNormalizeInstagram("instagram.com/accounts/login")).toBeNull();
  });

  it("rejects malformed handles", () => {
    expect(tryNormalizeInstagram("@.bad")).toBeNull();
    expect(tryNormalizeInstagram("bad.")).toBeNull();
    expect(tryNormalizeInstagram("a..b")).toBeNull();
    expect(tryNormalizeInstagram("a b")).toBeNull();
    expect(tryNormalizeInstagram("x".repeat(31))).toBeNull();
    expect(tryNormalizeInstagram("")).toBeNull();
  });

  it("throws InvalidInstagramError from the strict form", () => {
    expect(() => normalizeInstagram("not a handle!!")).toThrow(InvalidInstagramError);
  });

  it("canonicalInstagramUrl builds the profile url", () => {
    expect(canonicalInstagramUrl("Foo")).toBe("https://www.instagram.com/foo/");
  });
});
