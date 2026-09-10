import { NextRequest } from "next/server";
import { tryNormalizeInstagram } from "@/lib/instagram";
import { prisma } from "@/lib/db";
import { getSettings, toBiddingRules } from "@/lib/settings";
import { minTargetTotalCents } from "@/lib/bidding";
import { getListingRank } from "@/lib/listings";
import { formatMoney } from "@/lib/money";
import { handleApiError, jsonOk } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Live lookup used by the claim form. Given a raw @handle / URL, returns the
 * canonical username and — if it already exists — its lifetime total and the
 * server-computed minimum next target. The minimum ALWAYS comes from here.
 */
export async function GET(req: NextRequest) {
  try {
    const ip = clientIp(req.headers);
    const limited = rateLimit(`lookup:${ip}`, 40, 60_000);
    if (!limited.ok) return jsonOk({ ok: false, error: "rate_limited" }, { status: 429 });

    const q = req.nextUrl.searchParams.get("q") ?? "";
    const normalized = tryNormalizeInstagram(q);
    const settings = await getSettings();
    const rules = toBiddingRules(settings);

    if (!normalized) {
      return jsonOk({
        valid: false,
        currency: settings.currency,
        startingBidCents: settings.startingBidCents,
        minTargetCents: settings.startingBidCents,
        minTargetFormatted: formatMoney(settings.startingBidCents, settings.currency),
      });
    }

    const listing = await prisma.listing.findUnique({
      where: { username: normalized.username },
      include: { category: true },
    });

    if (!listing) {
      return jsonOk({
        valid: true,
        exists: false,
        username: normalized.username,
        canonicalUrl: normalized.canonicalUrl,
        currency: settings.currency,
        lifetimeTotalCents: 0,
        minTargetCents: settings.startingBidCents,
        minTargetFormatted: formatMoney(settings.startingBidCents, settings.currency),
      });
    }

    const minTargetCents = minTargetTotalCents(
      { totalCents: listing.totalCents, biddable: true },
      rules,
    );
    const rank = await getListingRank(listing.id);

    return jsonOk({
      valid: true,
      exists: true,
      listingId: listing.id,
      username: listing.username,
      canonicalUrl: listing.instagramUrl,
      category: { name: listing.category.name, slug: listing.category.slug },
      status: listing.status,
      currency: listing.currency,
      lifetimeTotalCents: listing.totalCents,
      lifetimeTotalFormatted: formatMoney(listing.totalCents, listing.currency),
      minTargetCents,
      minTargetFormatted: formatMoney(minTargetCents, listing.currency),
      bidCount: listing.bidCount,
      globalRank: rank.globalRank,
      categoryRank: rank.categoryRank,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
