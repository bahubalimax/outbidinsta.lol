import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { assertSameOrigin, handleApiError, jsonError, jsonOk } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A resized, compressed JPEG data URI. Client caps this well under this
// limit before sending; this is the server-side backstop.
const MAX_DATA_URI_LENGTH = 400_000;

const bodySchema = z.object({
  avatarUrl: z
    .string()
    .trim()
    .min(1)
    .max(MAX_DATA_URI_LENGTH)
    .refine((v) => v.startsWith("data:image/"), "Must be an image data URI"),
});

/**
 * A confirmed bidder can set their own listing's photo, right after paying.
 * The bidId itself acts as the capability token (only the payer sees it, via
 * the /checkout/return?bid=<id> URL) — there's no login system to check
 * ownership against otherwise. Only works once the bid is actually CONFIRMED,
 * so this can't be used to plant an image before payment clears.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(req);

    const ip = clientIp(req.headers);
    const limited = rateLimit(`avatar-upload:${ip}`, 10, 60_000);
    if (!limited.ok) {
      return jsonError(429, "Too many attempts. Please wait a moment.", "RATE_LIMITED");
    }

    const { id } = await ctx.params;
    const body = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(422, "Invalid image", "VALIDATION", parsed.error.flatten());
    }

    const bid = await prisma.bid.findUnique({ where: { id }, select: { status: true, listingId: true } });
    if (!bid) return jsonError(404, "Bid not found", "NOT_FOUND");
    if (bid.status !== "CONFIRMED") {
      return jsonError(403, "This bid isn't confirmed yet.", "NOT_CONFIRMED");
    }

    await prisma.listing.update({
      where: { id: bid.listingId },
      data: { avatarUrl: parsed.data.avatarUrl },
    });

    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
