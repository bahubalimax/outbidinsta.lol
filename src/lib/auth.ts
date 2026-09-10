import "server-only";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { env } from "@/lib/env";
import {
  ADMIN_COOKIE,
  SESSION_MAX_AGE,
  signAdminToken,
  verifyAdminToken,
  type AdminSession,
} from "@/lib/auth-token";

export { ADMIN_COOKIE };
export type { AdminSession };

/** Constant-time credential check against the configured admin identity. */
export function verifyAdminCredentials(email: string, password: string): boolean {
  const emailOk = safeEqual(email.trim().toLowerCase(), env.adminEmail);
  const passOk = safeEqual(password, env.adminPassword);
  return emailOk && passOk;
}

function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export async function startAdminSession(): Promise<void> {
  const token = await signAdminToken(env.authSecret, env.adminEmail);
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function endAdminSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  return verifyAdminToken(token, env.authSecret);
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) throw new UnauthorizedError();
  return session;
}
