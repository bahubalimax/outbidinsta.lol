/**
 * Bidding engine — PURE functions only. No DB, no network.
 *
 * Ranking is by LIFETIME SPEND: `listing.totalCents` is the sum of every
 * confirmed contribution. Placing a bid means paying so that the listing's
 * lifetime total reaches a chosen target. The server is the single source of
 * truth for the minimum target and for the amount actually charged.
 */

export interface BiddingRules {
  /** Minimum lifetime total for a brand-new listing (e.g. $10). */
  startingBidCents: number;
  /** Minimum step when raising a rank (e.g. $1). */
  minIncrementCents: number;
  /** Extra over the current #1 needed to take #1 (e.g. $5). */
  takeTopIncrementCents: number;
  /** Hard ceiling on a listing's lifetime total (e.g. $999,999). */
  maxBidCents: number;
}

export interface ListingSpendState {
  /** Lifetime confirmed total for this listing. 0 for a new listing. */
  totalCents: number;
  /** Whether this listing can currently receive contributions. */
  biddable: boolean;
}

/**
 * The minimum lifetime total the next contribution must reach for THIS listing.
 *
 *   new listing (total 0) -> startingBid                ($10)
 *   existing total $40    -> $40 + minIncrement ($1)    = $41
 */
export function minTargetTotalCents(state: ListingSpendState, rules: BiddingRules): number {
  if (!Number.isInteger(state.totalCents) || state.totalCents < 0) {
    throw new Error("totalCents must be a non-negative integer");
  }
  if (state.totalCents === 0) return rules.startingBidCents;
  return state.totalCents + rules.minIncrementCents;
}

/**
 * The lifetime total required to claim a given board rank.
 *   rank 1        -> boardLeaderTotal + takeTopIncrement ($5)
 *   any other row -> that row's total + minIncrement     ($1)
 */
export function claimRankTargetCents(
  rowTotalCents: number,
  isTopRank: boolean,
  boardLeaderTotalCents: number,
  rules: BiddingRules,
): number {
  return isTopRank
    ? boardLeaderTotalCents + rules.takeTopIncrementCents
    : rowTotalCents + rules.minIncrementCents;
}

/** Amount actually charged to reach `targetTotalCents` from the current total. */
export function chargeForTarget(currentTotalCents: number, targetTotalCents: number): number {
  return targetTotalCents - currentTotalCents;
}

export type BidRejectionReason =
  | "NOT_INTEGER"
  | "BELOW_MINIMUM"
  | "ABOVE_MAXIMUM"
  | "LISTING_NOT_BIDDABLE"
  | "NOT_WHOLE_UNIT";

export interface BidValidationResult {
  ok: boolean;
  reason?: BidRejectionReason;
  /** Minimum acceptable target lifetime total. */
  minTargetCents: number;
  /** Amount that would be charged for a valid target. */
  chargeCents?: number;
  message?: string;
}

/**
 * Validate a proposed target lifetime total against the live listing state and
 * the configured rules. `targetTotalCents` is the total the bidder wants the
 * listing to reach; it must be a whole currency unit (no fractional dollars).
 */
export function validateTarget(
  targetTotalCents: number,
  listing: ListingSpendState,
  rules: BiddingRules,
): BidValidationResult {
  const minTargetCents = minTargetTotalCents(listing, rules);

  if (!Number.isInteger(targetTotalCents) || targetTotalCents <= 0) {
    return {
      ok: false,
      reason: "NOT_INTEGER",
      minTargetCents,
      message: "Enter a whole amount.",
    };
  }
  if (targetTotalCents % rules.minIncrementCents !== 0) {
    return {
      ok: false,
      reason: "NOT_WHOLE_UNIT",
      minTargetCents,
      message: "Bids are in whole dollars.",
    };
  }
  if (!listing.biddable) {
    return {
      ok: false,
      reason: "LISTING_NOT_BIDDABLE",
      minTargetCents,
      message: "This listing is not currently accepting bids.",
    };
  }
  if (targetTotalCents < minTargetCents) {
    return {
      ok: false,
      reason: "BELOW_MINIMUM",
      minTargetCents,
      message: `The minimum total is ${minTargetCents} (minor units).`,
    };
  }
  if (targetTotalCents > rules.maxBidCents) {
    return {
      ok: false,
      reason: "ABOVE_MAXIMUM",
      minTargetCents,
      message: `The maximum total is ${rules.maxBidCents} (minor units).`,
    };
  }

  return {
    ok: true,
    minTargetCents,
    chargeCents: chargeForTarget(listing.totalCents, targetTotalCents),
  };
}

/**
 * Rank helper: given rows with a spend value and a tie-break timestamp (earlier
 * wins), assign 1-based ranks. Pure — used by every board and tested directly.
 */
export function assignRanks<T extends { spendCents: number; tieAt: number }>(
  rows: T[],
): (T & { rank: number })[] {
  return [...rows]
    .sort((a, b) => (b.spendCents !== a.spendCents ? b.spendCents - a.spendCents : a.tieAt - b.tieAt))
    .map((row, i) => ({ ...row, rank: i + 1 }));
}
