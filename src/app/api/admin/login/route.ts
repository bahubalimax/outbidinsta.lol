import { NextRequest } from "next/server";
import { adminLoginSchema } from "@/lib/validation";
import { verifyAdminCredentials, startAdminSession } from "@/lib/auth";
import { assertSameOrigin, handleApiError, jsonError, jsonOk } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { log } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);

    const ip = clientIp(req.headers);
    const limited = rateLimit(`admin-login:${ip}`, 5, 5 * 60_000);
    if (!limited.ok) {
      return jsonError(429, "Too many attempts. Try again later.", "RATE_LIMITED");
    }

    const body = await req.json().catch(() => null);
    const { email, password } = adminLoginSchema.parse(body);

    if (!verifyAdminCredentials(email, password)) {
      log.warn("admin.login.failed", { ip });
      return jsonError(401, "Invalid email or password", "BAD_CREDENTIALS");
    }

    await startAdminSession();
    log.info("admin.login.success", { ip });
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
