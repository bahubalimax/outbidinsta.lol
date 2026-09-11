import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSettings, toBiddingRules } from "@/lib/settings";
import { normalizeInstagram } from "@/lib/instagram";
import { parseAmountToMinor } from "@/lib/money";
import { minTargetTotalCents, validateTarget, type ListingSpendState } from "@/lib/bidding";
import { createBidCheckout } from "@/lib/dodo";
import { log } from "@/lib/logger";

export class BidError extends Error {
  code: string;
  httpStatus: number;
  minTargetCents?: number;

  constructor(code: string, message: string, httpStatus = 422, minTargetCents?: number) {
    super(message);
    this.name = "BidError";
    this.code = code;
    this.httpStatus = httpStatus;
    this.minTargetCents = minTargetCents;
  }
}

const BIDDABLE_STATUSES: ReadonlySet<string> = new Set(["PENDING", "ACTIVE"]);

export interface CreateBidIntentInput {
  listingId?: string;
  instagram?: string;
  categorySlug?: string;
  /** Target LIFETIME total (major units string, e.g. "17006"). */
  amountRaw: string;
  /** Optional — Dodo's own hosted checkout collects the paying email instead. */
  email?: string;
  /** Optional — a self-supplied photo URL, applied to the listing once payment confirms. */
  avatarUrl?: string;
  intendedTop?: boolean;
}

export interface CreateBidIntentResult {
  checkoutUrl: string;
  bidId: string;
  listingId: string;
  username: string;
  /** Amount actually charged (the difference for an existing listing). */
  chargeCents: number;
  targetTotalCents: number;
  currency: string;
}

/**
 * Create a PENDING contribution + PENDING payment and a hosted checkout.
 * NOTHING here changes the boards — a bid only counts after the verified
 * `payment.succeeded` webhook (see confirmBidPayment).
 */
export async function createBidIntent(
  input: CreateBidIntentInput,
): Promise<CreateBidIntentResult> {
  const settings = await getSettings();
  const rules = toBiddingRules(settings);

  if (!settings.biddingEnabled) {
    throw new BidError("BIDDING_DISABLED", "Bidding is temporarily paused.", 403);
  }

  const listing = await resolveListing(input, settings.listingsEnabled);

  if (!BIDDABLE_STATUSES.has(listing.status)) {
    throw new BidError("LISTING_NOT_BIDDABLE", "This listing is not accepting bids.", 403);
  }

  let targetTotalCents: number;
  try {
    targetTotalCents = parseAmountToMinor(input.amountRaw, listing.currency);
  } catch {
    throw new BidError(
      "INVALID_AMOUNT",
      "Enter a valid amount.",
      422,
      minTargetTotalCents({ totalCents: listing.totalCents, biddable: true }, rules),
    );
  }

  const state: ListingSpendState = { totalCents: listing.totalCents, biddable: true };
  const check = validateTarget(targetTotalCents, state, rules);
  if (!check.ok) {
    const status = check.reason === "BELOW_MINIMUM" ? 409 : 422;
    throw new BidError(check.reason ?? "INVALID_AMOUNT", check.message ?? "Invalid bid.", status, check.minTargetCents);
  }

  const chargeCents = check.chargeCents ?? targetTotalCents - listing.totalCents;
  if (chargeCents < rules.minIncrementCents) {
    throw new BidError(
      "BELOW_MINIMUM",
      "You need to raise your total by at least the minimum increment.",
      409,
      check.minTargetCents,
    );
  }

  // No email up front — Dodo's own hosted checkout collects it. Give the user
  // row a unique placeholder; the webhook can reconcile the real address once
  // Dodo reports it on payment.succeeded.
  const user = input.email
    ? await prisma.user.upsert({
        where: { email: input.email.toLowerCase() },
        create: { email: input.email.toLowerCase() },
        update: {},
      })
    : await prisma.user.create({ data: { email: `guest-${randomUUID()}@outbidinsta.lol` } });

  const { bid, payment } = await prisma.$transaction(async (tx) => {
    const bid = await tx.bid.create({
      data: {
        listingId: listing.id,
        bidderId: user.id,
        amountCents: chargeCents,
        targetTotalCents,
        basedOnTotalCents: listing.totalCents,
        currency: listing.currency,
        status: "PENDING",
        intendedTop: !!input.intendedTop,
      },
    });
    const payment = await tx.payment.create({
      data: {
        provider: "dodo",
        listingId: listing.id,
        bidId: bid.id,
        userId: user.id,
        amountCents: chargeCents,
        currency: listing.currency,
        status: "pending",
        metadata: {
          username: listing.username,
          targetTotalCents,
          basedOnTotalCents: listing.totalCents,
          ...(input.avatarUrl ? { avatarUrl: input.avatarUrl } : {}),
        },
      },
    });
    await tx.bid.update({ where: { id: bid.id }, data: { paymentId: payment.id } });
    return { bid, payment };
  });

  try {
    const checkout = await createBidCheckout({
      amountCents: chargeCents,
      currency: listing.currency,
      email: input.email?.toLowerCase(),
      listingId: listing.id,
      bidId: bid.id,
      userId: user.id,
      username: listing.username,
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { providerCheckoutId: checkout.sessionId, checkoutUrl: checkout.checkoutUrl },
    });

    log.info("bid.intent.created", {
      bidId: bid.id,
      listingId: listing.id,
      username: listing.username,
      chargeCents,
      targetTotalCents,
    });

    return {
      checkoutUrl: checkout.checkoutUrl,
      bidId: bid.id,
      listingId: listing.id,
      username: listing.username,
      chargeCents,
      targetTotalCents,
      currency: listing.currency,
    };
  } catch (err) {
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: { status: "failed", failureReason: "checkout_creation_failed" },
      }),
      prisma.bid.update({ where: { id: bid.id }, data: { status: "FAILED" } }),
    ]);
    log.error("bid.intent.checkout_failed", { bidId: bid.id, err: String(err) });
    throw new BidError("CHECKOUT_FAILED", "Could not start checkout. Please try again.", 502);
  }
}

interface ResolvedListing {
  id: string;
  username: string;
  currency: string;
  totalCents: number;
  status: string;
}

async function resolveListing(
  input: CreateBidIntentInput,
  listingsEnabled: boolean,
): Promise<ResolvedListing> {
  if (input.listingId) {
    const listing = await prisma.listing.findUnique({ where: { id: input.listingId } });
    if (!listing) throw new BidError("LISTING_NOT_FOUND", "Listing not found.", 404);
    return listing;
  }

  if (!input.instagram || !input.categorySlug) {
    throw new BidError("INVALID_INPUT", "Instagram handle and category are required.", 422);
  }

  const { username, canonicalUrl } = normalizeInstagram(input.instagram);

  const existing = await prisma.listing.findUnique({ where: { username } });
  if (existing) return existing;

  if (!listingsEnabled) {
    throw new BidError("LISTINGS_DISABLED", "New listings are temporarily paused.", 403);
  }

  const category = await prisma.category.findFirst({
    where: { slug: input.categorySlug, active: true },
  });
  if (!category) throw new BidError("INVALID_CATEGORY", "Choose a valid category.", 422);

  const settings = await getSettings();
  try {
    return await prisma.listing.create({
      data: {
        username,
        instagramUrl: canonicalUrl,
        categoryId: category.id,
        currency: settings.currency,
        status: "PENDING",
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const raced = await prisma.listing.findUnique({ where: { username } });
      if (raced) return raced;
    }
    throw err;
  }
}
