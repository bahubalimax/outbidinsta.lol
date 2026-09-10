import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getSettings, toBiddingRules } from "@/lib/settings";
import { minTargetTotalCents } from "@/lib/bidding";
import { getListingRank } from "@/lib/listings";
import { formatMoney } from "@/lib/money";
import { handleApiError, jsonError, jsonOk } from "@/lib/http";
import { CLAIM_MISSED_MESSAGE, VOID_MESSAGE } from "@/lib/refund-policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Status of a single bid — used by the /checkout/return poller. No PII. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const bid = await prisma.bid.findUnique({
      where: { id },
      include: { listing: { include: { category: true } }, payment: true },
    });
    if (!bid) return jsonError(404, "Bid not found", "NOT_FOUND");

    const settings = await getSettings();
    const rules = toBiddingRules(settings);
    const listing = bid.listing;
    const rank = bid.status === "CONFIRMED" ? await getListingRank(listing.id) : null;

    let outcome:
      | "pending"
      | "applied"
      | "applied_below_target"
      | "voided"
      | "refunded"
      | "failed"
      | "cancelled"
      | "disputed";
    if (bid.status === "CONFIRMED") {
      outcome =
        bid.intendedTop && rank?.globalRank && rank.globalRank > 1
          ? "applied_below_target"
          : "applied";
    } else if (bid.status === "VOID") outcome = "voided";
    else if (bid.status === "REFUNDED") outcome = "refunded";
    else if (bid.status === "FAILED") outcome = "failed";
    else if (bid.status === "CANCELLED") outcome = "cancelled";
    else if (bid.status === "DISPUTED") outcome = "disputed";
    else outcome = "pending";

    return jsonOk({
      outcome,
      bidStatus: bid.status,
      paymentStatus: bid.payment?.status ?? "pending",
      chargeCents: bid.amountCents,
      chargeFormatted: formatMoney(bid.amountCents, bid.currency),
      targetTotalCents: bid.targetTotalCents,
      currency: bid.currency,
      username: listing.username,
      category: { name: listing.category.name, slug: listing.category.slug },
      lifetimeTotalCents: listing.totalCents,
      lifetimeTotalFormatted: formatMoney(listing.totalCents, listing.currency),
      minNextTargetCents: minTargetTotalCents(
        { totalCents: listing.totalCents, biddable: true },
        rules,
      ),
      globalRank: rank?.globalRank ?? null,
      categoryRank: rank?.categoryRank ?? null,
      note:
        outcome === "voided"
          ? VOID_MESSAGE
          : outcome === "applied_below_target"
            ? CLAIM_MISSED_MESSAGE
            : undefined,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
