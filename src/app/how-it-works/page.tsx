import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { Prose } from "@/components/prose";
import { AFFILIATION_DISCLAIMER } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "How it works",
  description: "How bidding works on OutBidInsta — server-calculated bids, confirmed payments only.",
  alternates: { canonical: "/how-it-works" },
};

export default async function HowItWorksPage() {
  const s = await getSettings();
  const start = formatMoney(s.startingBidCents, s.currency);
  const inc = formatMoney(s.minIncrementCents, s.currency);

  return (
    <Prose title="How it works">
      <p>
        OutBidInsta is a public, pay-to-rank leaderboard for Instagram profiles. You pick a profile,
        choose a category, and pay to claim a rank. The highest <strong>confirmed</strong> paid bid
        is #1.
      </p>

      <h2>1. Paste your profile</h2>
      <p>
        Enter an <code>@username</code> or a link like{" "}
        <code>instagram.com/username</code>. We normalize it to a single canonical handle. We never
        ask for your Instagram password and we don&apos;t log in to Instagram.
      </p>

      <h2>2. Set your bid</h2>
      <p>
        The starting bid is <strong>{start}</strong>. Every new bid on a profile must be at least{" "}
        <strong>{inc}</strong> higher than that profile&apos;s current bid. The minimum next bid is
        always calculated on our server — the number in your browser is only a convenience.
      </p>
      <ul>
        <li>Current bid {formatMoney(1000, s.currency)} → next bid {formatMoney(1100, s.currency)}</li>
        <li>A bid of {formatMoney(1050, s.currency)} is rejected (below the minimum)</li>
        <li>A bid of {formatMoney(1100, s.currency)} or {formatMoney(2000, s.currency)} is valid</li>
      </ul>

      <h2>3. Pay to claim</h2>
      <p>
        You&apos;re redirected to our payment provider&apos;s secure checkout. Your rank only changes
        after we receive a <strong>verified</strong> payment confirmation from the provider — never
        from your browser saying &ldquo;success&rdquo;.
      </p>

      <h2>4. Someone got there first?</h2>
      <p>
        If another bid for the same amount is confirmed before yours, your payment can&apos;t claim
        the position. We&apos;ll tell you clearly and your payment is reviewed/refunded per the{" "}
        <Link href="/refund-policy">Refund Policy</Link>.
      </p>

      <p className="text-xs text-muted-foreground">{AFFILIATION_DISCLAIMER}</p>
    </Prose>
  );
}
