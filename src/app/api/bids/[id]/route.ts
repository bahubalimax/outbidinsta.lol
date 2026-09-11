import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getSettings, toBiddingRules } from "@/lib/settings";
import { minTargetTotalCents } from "@/lib/bidding";
import { getListingRank } from "@/lib/listings";
import { formatMoney } from "@/lib/money";
import { handleApiError, jsonError, jsonOk } from "@/lib/http";
import { CLAIM_MISSED_MESSAGE, VOID_MESSAGE } from "@/lib/refund-policy";
import { retrieveCheckoutSession } from "@/lib/dodo";
import { confirmBidPayment, handlePaymentFailed, handlePaymentCancelled } from "@/lib/payments";
import { log } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BID_INCLUDE = { listing: { include: { category: true } }, payment: true } as const;

/** Status of a single bid — used by the /checkout/return poller. No PII. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    let bid = await prisma.bid.findUnique({ where: { id }, include: BID_INCLUDE });
    if (!bid) return jsonError(404, "Bid not found", "NOT_FOUND");

    // The user is actively watching this page for a confirmation — don't
    // make them wait on the webhook (unreliable) or the 5-minute batch
    // reconciler. Check Dodo directly, right now, for this one payment.
    if (bid.status === "PENDING" && bid.payment?.status === "pending" && bid.payment.providerCheckoutId) {
      try {
        const session = await retrieveCheckoutSession(bid.payment.providerCheckoutId);
        const metadata = (bid.payment.metadata as Record<string, unknown>) ?? {};
        const fallbackId = bid.payment.providerCheckoutId;

        if (session.payment_status === "succeeded" && session.payment_id) {
          await confirmBidPayment({
            providerPaymentId: session.payment_id,
            checkoutSessionId: fallbackId,
            metadata,
            paidAmountCents: null,
            currency: null,
          });
        } else if (session.payment_status === "failed") {
          await handlePaymentFailed(session.payment_id ?? fallbackId, "dodo_reported_failed", metadata);
        } else if (session.payment_status === "cancelled") {
          await handlePaymentCancelled(session.payment_id ?? fallbackId, metadata);
        }
        bid = await prisma.bid.findUnique({ where: { id }, include: BID_INCLUDE });
      } catch (err) {
        log.warn("bids.status.live_check_failed", { bidId: id, err: String(err) });
      }
    }
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
