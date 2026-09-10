import { describe, it, expect } from "vitest";
import {
  minTargetTotalCents,
  validateTarget,
  chargeForTarget,
  claimRankTargetCents,
  assignRanks,
  type BiddingRules,
} from "@/lib/bidding";

const rules: BiddingRules = {
  startingBidCents: 1000, // $10
  minIncrementCents: 100, // $1
  takeTopIncrementCents: 500, // $5
  maxBidCents: 99999900, // $999,999
};

describe("minimum next target", () => {
  it("is the starting bid for a new listing", () => {
    expect(minTargetTotalCents({ totalCents: 0, biddable: true }, rules)).toBe(1000);
  });
  it("is current total + increment for an existing listing", () => {
    expect(minTargetTotalCents({ totalCents: 4000, biddable: true }, rules)).toBe(4100);
  });
});

describe("validateTarget", () => {
  it("accepts the exact minimum and anything higher (whole units)", () => {
    const s = { totalCents: 4000, biddable: true };
    expect(validateTarget(4100, s, rules).ok).toBe(true);
    expect(validateTarget(10000, s, rules).ok).toBe(true);
  });

  it("rejects a target equal to the current total", () => {
    const r = validateTarget(4000, { totalCents: 4000, biddable: true }, rules);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("BELOW_MINIMUM");
  });

  it("rejects a target below the minimum", () => {
    // current $40, min target $41, trying $40.50
    const r = validateTarget(4050, { totalCents: 4000, biddable: true }, rules);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("NOT_WHOLE_UNIT"); // 4050 is not a whole dollar
  });

  it("rejects the starting bid when a new listing is priced below it", () => {
    const r = validateTarget(500, { totalCents: 0, biddable: true }, rules);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("BELOW_MINIMUM");
  });

  it("rejects fractional (non-whole-unit) targets", () => {
    const r = validateTarget(1050, { totalCents: 0, biddable: true }, rules);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("NOT_WHOLE_UNIT");
  });

  it("rejects above the maximum", () => {
    const r = validateTarget(rules.maxBidCents + 100, { totalCents: 0, biddable: true }, rules);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("ABOVE_MAXIMUM");
  });

  it("rejects when the listing is not biddable", () => {
    const r = validateTarget(2000, { totalCents: 0, biddable: false }, rules);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("LISTING_NOT_BIDDABLE");
  });

  it("returns the charge for a valid target (difference for a top-up)", () => {
    const r = validateTarget(4100, { totalCents: 4000, biddable: true }, rules);
    expect(r.ok).toBe(true);
    expect(r.chargeCents).toBe(100);
  });

  it("charge for a brand-new listing is the whole target", () => {
    const r = validateTarget(1000, { totalCents: 0, biddable: true }, rules);
    expect(r.chargeCents).toBe(1000);
  });
});

describe("chargeForTarget", () => {
  it("is target minus current total", () => {
    expect(chargeForTarget(4000, 4100)).toBe(100);
    expect(chargeForTarget(0, 1000)).toBe(1000);
  });
});

describe("claimRankTargetCents", () => {
  it("adds the take-top increment for rank 1", () => {
    expect(claimRankTargetCents(1700100, true, 1700100, rules)).toBe(1700600);
  });
  it("adds the minimum increment for other ranks", () => {
    expect(claimRankTargetCents(1600000, false, 1700100, rules)).toBe(1600100);
  });
});

describe("assignRanks", () => {
  it("ranks by spend desc, breaking ties by earlier tieAt", () => {
    const ranked = assignRanks([
      { id: "a", spendCents: 100, tieAt: 50 },
      { id: "b", spendCents: 300, tieAt: 10 },
      { id: "c", spendCents: 300, tieAt: 5 },
    ]);
    expect(ranked.map((r) => r.id)).toEqual(["c", "b", "a"]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it("keeps the older listing above on equal amounts", () => {
    const older = { id: "old", spendCents: 5000, tieAt: 1 };
    const newer = { id: "new", spendCents: 5000, tieAt: 999 };
    const ranked = assignRanks([newer, older]);
    expect(ranked[0].id).toBe("old");
  });
});

describe("concurrent claims for the same amount (cumulative model)", () => {
  it("both payments still count; the first-confirmed listing keeps the higher rank", () => {
    // A and B each pay $11 aiming for #1 when the leader has $10.
    // In the cumulative model both totals become $11+startingbase; ranking then
    // breaks the $11 vs $11 tie by whichever listing's contribution confirmed first.
    const rankedAFirst = assignRanks([
      { id: "A", spendCents: 1100, tieAt: 100 }, // A confirmed first
      { id: "B", spendCents: 1100, tieAt: 200 },
    ]);
    expect(rankedAFirst[0].id).toBe("A");
    expect(rankedAFirst[1].id).toBe("B");
    // Neither is "lost" — both are on the board.
    expect(rankedAFirst).toHaveLength(2);
  });
});
