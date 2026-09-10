import { SignJWT, jwtVerify } from "jose";

/**
 * Admin session token sign/verify. Kept free of `next/headers` and `server-only`
 * so it can run in Middleware (edge) as well as in route handlers.
 */

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
export const ADMIN_COOKIE = "obi_admin";

function key(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function signAdminToken(secret: string, subject: string): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(subject)
    .setIssuedAt()
    .setIssuer("outbidinsta")
    .setAudience("outbidinsta-admin")
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(key(secret));
}

export interface AdminSession {
  email: string;
}

export async function verifyAdminToken(
  token: string,
  secret: string,
): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, key(secret), {
      issuer: "outbidinsta",
      audience: "outbidinsta-admin",
    });
    if (payload.role !== "admin" || typeof payload.sub !== "string") return null;
    return { email: payload.sub };
  } catch {
    return null;
  }
}

export const SESSION_MAX_AGE = SESSION_TTL_SECONDS;
