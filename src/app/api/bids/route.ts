import { NextRequest } from "next/server";
import { createBidSchema } from "@/lib/validation";
import { createBidIntent, BidError } from "@/lib/bids";
import { assertSameOrigin, handleApiError, jsonError, jsonOk } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { formatMoney } from "@/lib/money";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);

    const ip = clientIp(req.headers);
    const limited = rateLimit(`bids:${ip}`, 10, 60_000);
    if (!limited.ok) {
      return jsonError(429, "Too many attempts. Please wait a moment.", "RATE_LIMITED");
    }

    const body = await req.json().catch(() => null);
    const parsed = createBidSchema.parse(body);

    const result = await createBidIntent({
      listingId: parsed.listingId,
      instagram: parsed.instagram,
      categorySlug: parsed.categorySlug,
      amountRaw: parsed.amount,
      email: parsed.email,
      avatarUrl: parsed.avatarUrl || undefined,
      intendedTop: parsed.intendedTop,
    });

    return jsonOk({
      checkoutUrl: result.checkoutUrl,
      bidId: result.bidId,
      username: result.username,
      chargeCents: result.chargeCents,
      chargeFormatted: formatMoney(result.chargeCents, result.currency),
      targetTotalCents: result.targetTotalCents,
      currency: result.currency,
    });
  } catch (err) {
    if (err instanceof BidError) {
      return jsonError(err.httpStatus, err.message, err.code, {
        minTargetCents: err.minTargetCents,
        minTargetFormatted:
          err.minTargetCents != null ? formatMoney(err.minTargetCents) : undefined,
      });
    }
    return handleApiError(err);
  }
}
