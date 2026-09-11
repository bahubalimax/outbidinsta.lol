import { NextRequest } from "next/server";
import { z } from "zod";
import { recordPageView } from "@/lib/analytics";
import { assertSameOrigin, jsonOk } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { log } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const trackSchema = z.object({
  path: z.string().min(1).max(300),
  referrer: z.string().max(2000).optional().nullable(),
});

/**
 * Beacon endpoint for the built-in analytics (src/components/analytics-beacon.tsx).
 * Fire-and-forget from the client — never blocks page render, and a failure here
 * is silently swallowed client-side (analytics must never break the site).
 */
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);

    const ip = clientIp(req.headers);
    const limited = rateLimit(`track:${ip}`, 120, 60_000);
    if (!limited.ok) return jsonOk({ ok: false }, { status: 202 });

    const body = await req.json().catch(() => null);
    const parsed = trackSchema.safeParse(body);
    if (!parsed.success) return jsonOk({ ok: false }, { status: 202 });

    const country =
      req.headers.get("x-vercel-ip-country") ?? req.headers.get("cf-ipcountry") ?? null;

    await recordPageView({
      path: parsed.data.path,
      referrer: parsed.data.referrer,
      userAgent: req.headers.get("user-agent"),
      country,
      ip,
    });

    return jsonOk({ ok: true });
  } catch (err) {
    log.warn("track.failed", { err: String(err) });
    // Never let analytics surface as a real error to the beacon.
    return jsonOk({ ok: false }, { status: 202 });
  }
}
