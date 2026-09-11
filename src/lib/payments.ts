import "server-only";
import { revalidateTag } from "next/cache";
import { prisma, runSerializable } from "@/lib/db";
import { getListingRank, recomputeListingTotal } from "@/lib/listings";
import { recordActivity } from "@/lib/activity";
import { refundPayment } from "@/lib/dodo";
import { fetchInstagramAvatarUrl } from "@/lib/instagram-avatar";
import { getSettings } from "@/lib/settings";
import { log } from "@/lib/logger";

export type ConfirmOutcome = "applied" | "voided" | "noop";

export interface ConfirmResult {
  outcome: ConfirmOutcome;
  bidId?: string;
  listingId?: string;
  username?: string;
}

interface ConfirmInput {
  providerPaymentId: string;
  checkoutSessionId?: string | null;
  metadata: Record<string, unknown>;
  paidAmountCents?: number | null;
  currency?: string | null;
}

/** Locate our Payment row from webhook data without trusting the browser. */
async function findPaymentRecord(input: ConfirmInput) {
  const byProviderId = await prisma.payment.findFirst({
    where: { provider: "dodo", providerPaymentId: input.providerPaymentId },
  });
  if (byProviderId) return byProviderId;

  if (input.checkoutSessionId) {
    const bySession = await prisma.payment.findFirst({
      where: { provider: "dodo", providerCheckoutId: input.checkoutSessionId },
    });
    if (bySession) return bySession;
  }

  const bidId = typeof input.metadata.bidId === "string" ? input.metadata.bidId : null;
  if (bidId) {
    const byBid = await prisma.payment.findFirst({ where: { bidId } });
    if (byBid) return byBid;
  }
  return null;
}

/**
 * Verified `payment.succeeded` handler.
 *
 *  1. resolve payment + bid + listing
 *  2. mark payment paid (idempotent)
 *  3. if the bid is still PENDING and the listing can accept it, ADD the
 *     contribution to the listing's lifetime total (atomic increment — no
 *     compare-and-set is needed because contributions are additive)
 *  4. if the listing was removed/disabled, VOID the contribution and refund
 */
export async function confirmBidPayment(input: ConfirmInput): Promise<ConfirmResult> {
  const record = await findPaymentRecord(input);
  if (!record) {
    log.warn("payment.confirm.no_record", {
      providerPaymentId: input.providerPaymentId,
      metadata: input.metadata,
    });
    return { outcome: "noop" };
  }
  if (record.status === "paid") {
    return { outcome: "noop", bidId: record.bidId ?? undefined, listingId: record.listingId };
  }

  const settings = await getSettings();

  const result = await runSerializable<ConfirmResult & { voidProviderPaymentId?: string }>(
    async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: record.id },
        include: { bid: true },
      });
      if (!payment) return { outcome: "noop" };

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "paid",
          providerPaymentId: input.providerPaymentId,
          metadata: {
            ...(payment.metadata as Record<string, unknown> | null),
            paidAmountCents: input.paidAmountCents ?? payment.amountCents,
            paidCurrency: input.currency ?? payment.currency,
          },
        },
      });

      const bid = payment.bid;
      if (!bid || bid.status !== "PENDING") {
        return { outcome: "noop", bidId: bid?.id, listingId: payment.listingId };
      }

      const listing = await tx.listing.findUnique({ where: { id: payment.listingId } });
      if (!listing) return { outcome: "noop", bidId: bid.id };

      const biddable = listing.status === "PENDING" || listing.status === "ACTIVE";
      if (!biddable) {
        await tx.bid.update({ where: { id: bid.id }, data: { status: "VOID" } });
        log.info("payment.confirm.voided", { bidId: bid.id, listingId: listing.id });
        return {
          outcome: "voided",
          bidId: bid.id,
          listingId: listing.id,
          username: listing.username,
          voidProviderPaymentId: payment.providerPaymentId ?? input.providerPaymentId,
        };
      }

      await tx.listing.update({
        where: { id: listing.id },
        data: {
          totalCents: { increment: bid.amountCents },
          bidCount: { increment: 1 },
          lastBidAt: new Date(),
          status: "ACTIVE",
          firstBidderId: listing.firstBidderId ?? bid.bidderId,
        },
      });
      await tx.bid.update({
        where: { id: bid.id },
        data: { status: "CONFIRMED", confirmedAt: new Date() },
      });

      log.info("payment.confirm.applied", {
        bidId: bid.id,
        listingId: listing.id,
        chargeCents: bid.amountCents,
        newTotalCents: listing.totalCents + bid.amountCents,
        wasFirst: listing.bidCount === 0,
      });

      return {
        outcome: "applied",
        bidId: bid.id,
        listingId: listing.id,
        username: listing.username,
      };
    },
  );

  if (result.outcome === "applied" && result.listingId && result.username) {
    const [listing, rank] = await Promise.all([
      prisma.listing.findUnique({
        where: { id: result.listingId },
        include: { category: true },
      }),
      getListingRank(result.listingId),
    ]);
    const bid = await prisma.bid.findUnique({ where: { id: result.bidId! } });

    // Best-effort real avatar backfill from the public Instagram profile —
    // a listing's first confirmed bid is when it starts actually appearing
    // sitewide, so this is the moment to fetch it. Never blocks or fails
    // the payment itself; falls back to the initials avatar on any failure.
    if (listing && !listing.avatarUrl) {
      const avatarUrl = await fetchInstagramAvatarUrl(result.username!);
      if (avatarUrl) {
        await prisma.listing.update({ where: { id: result.listingId! }, data: { avatarUrl } }).catch(() => {});
      }
    }

    await prisma.$transaction(async (tx) => {
      await recordActivity(tx, {
        type: listing && listing.bidCount <= 1 ? "NEW_LISTING" : "RAISE",
        listingId: result.listingId!,
        username: result.username!,
        categorySlug: listing?.category.slug ?? null,
        rank: rank.globalRank,
        amountCents: bid?.amountCents ?? null,
        totalCents: listing?.totalCents ?? null,
        currency: listing?.currency,
      });
    });
    // The rank only ever changes here (after a verified webhook) — bust the
    // short-lived board cache immediately instead of waiting for it to expire.
    revalidateTag("board");
  }

  if (result.outcome === "voided" && settings.autoRefundVoided) {
    await tryRefund(result.bidId!, result.voidProviderPaymentId, "void_auto_refund", "Listing was not available (OutBidInsta refund policy)");
  }

  return {
    outcome: result.outcome,
    bidId: result.bidId,
    listingId: result.listingId,
    username: result.username,
  };
}

async function tryRefund(bidId: string, providerPaymentId: string | undefined, reasonCode: string, reasonText: string) {
  try {
    const payment = await prisma.payment.findFirst({ where: { bidId } });
    const refundId = providerPaymentId ?? payment?.providerPaymentId ?? undefined;
    if (!refundId) {
      log.warn("payment.refund.no_provider_id", { bidId });
      return;
    }
    await refundPayment(refundId, reasonText);
    if (payment) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "refunded", failureReason: reasonCode },
      });
    }
    log.info("payment.refund.issued", { bidId, refundId, reasonCode });
  } catch (err) {
    log.error("payment.refund.failed", { bidId, err: String(err) });
  }
}

/** `payment.failed` */
export async function handlePaymentFailed(
  providerPaymentId: string,
  reason: string | null,
  metadata: Record<string, unknown>,
): Promise<void> {
  const record = await findPaymentRecord({ providerPaymentId, metadata });
  if (!record) return;
  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: record.id },
      data: { status: "failed", providerPaymentId, failureReason: reason ?? "payment_failed" },
    });
    if (record.bidId) {
      await tx.bid.updateMany({
        where: { id: record.bidId, status: "PENDING" },
        data: { status: "FAILED" },
      });
    }
  });
  log.info("payment.failed", { paymentId: record.id, bidId: record.bidId });
}

/** `payment.cancelled` */
export async function handlePaymentCancelled(
  providerPaymentId: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  const record = await findPaymentRecord({ providerPaymentId, metadata });
  if (!record) return;
  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: record.id },
      data: { status: "cancelled", providerPaymentId },
    });
    if (record.bidId) {
      await tx.bid.updateMany({
        where: { id: record.bidId, status: "PENDING" },
        data: { status: "CANCELLED" },
      });
    }
  });
  log.info("payment.cancelled", { paymentId: record.id, bidId: record.bidId });
}

/** `refund.succeeded` — subtract a refunded contribution from the listing total. */
export async function handleRefundSucceeded(
  providerPaymentId: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  const record = await findPaymentRecord({ providerPaymentId, metadata });
  if (!record) return;

  await runSerializable(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: record.id },
      include: { bid: true },
    });
    if (!payment) return;

    await tx.payment.update({
      where: { id: payment.id },
      data: { status: "refunded", providerPaymentId },
    });

    const bid = payment.bid;
    if (!bid) return;
    if (bid.status === "CONFIRMED") {
      await tx.bid.update({ where: { id: bid.id }, data: { status: "REFUNDED" } });
      await recomputeListingTotal(tx, payment.listingId);
      log.info("refund.applied", { bidId: bid.id, listingId: payment.listingId });
    } else if (bid.status === "PENDING") {
      await tx.bid.update({ where: { id: bid.id }, data: { status: "REFUNDED" } });
    }
  });
  revalidateTag("board");
}

/** `dispute.opened` — treat a disputed contribution as removed from the totals. */
export async function handleDisputeOpened(
  providerPaymentId: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  const record = await findPaymentRecord({ providerPaymentId, metadata });
  if (!record) return;

  await runSerializable(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: record.id },
      include: { bid: true },
    });
    if (!payment) return;

    await tx.payment.update({
      where: { id: payment.id },
      data: { status: "disputed", providerPaymentId },
    });

    const bid = payment.bid;
    if (bid && bid.status === "CONFIRMED") {
      await tx.bid.update({ where: { id: bid.id }, data: { status: "DISPUTED" } });
      await recomputeListingTotal(tx, payment.listingId);
      log.info("dispute.applied", { bidId: bid.id, listingId: payment.listingId });
    }
  });
  revalidateTag("board");
}
