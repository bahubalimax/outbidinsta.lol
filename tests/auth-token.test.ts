import { describe, it, expect } from "vitest";
import { signAdminToken, verifyAdminToken } from "@/lib/auth-token";

const secret = "an-admin-signing-secret-at-least-32-chars-long";

describe("admin session tokens", () => {
  it("round-trips a valid token", async () => {
    const token = await signAdminToken(secret, "admin@example.com");
    const session = await verifyAdminToken(token, secret);
    expect(session?.email).toBe("admin@example.com");
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await signAdminToken(secret, "admin@example.com");
    expect(await verifyAdminToken(token, "a-completely-different-secret-value-here")).toBeNull();
  });

  it("rejects a tampered token", async () => {
    const token = await signAdminToken(secret, "admin@example.com");
    const tampered = token.slice(0, -3) + "abc";
    expect(await verifyAdminToken(tampered, secret)).toBeNull();
  });

  it("rejects garbage", async () => {
    expect(await verifyAdminToken("not.a.jwt", secret)).toBeNull();
    expect(await verifyAdminToken("", secret)).toBeNull();
  });
});
