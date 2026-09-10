import type { Metadata } from "next";
import Link from "next/link";
import { Prose } from "@/components/prose";
import { SITE_NAME } from "@/lib/site";
import { CLAIM_MISSED_MESSAGE, VOID_MESSAGE } from "@/lib/refund-policy";

export const metadata: Metadata = {
  title: "Refund Policy",
  alternates: { canonical: "/refund-policy" },
};

export default function RefundPolicyPage() {
  return (
    <Prose title="Refund Policy" updated="2026-09-11">
      <p>
        A bid on {SITE_NAME} is a payment toward a position on a public leaderboard. Rank is by
        lifetime spend, so a payment that clears always counts toward your rank. This policy explains
        the exceptions.
      </p>

      <h2>Confirmed bids are non-refundable</h2>
      <p>
        Once your payment is verified and added to a profile&apos;s lifetime total, it is{" "}
        <strong>non-refundable</strong>. Being outbid later is the normal working of the leaderboard
        and is not a ground for a refund.
      </p>

      <h2>The top spot moved while you were paying</h2>
      <p>
        If you were bidding to take #1 and, by the time your payment cleared, someone had spent more,
        your payment still counts toward your rank — you simply land where that total places you. We
        show: &ldquo;{CLAIM_MISSED_MESSAGE}&rdquo; This is not refunded.
      </p>

      <h2>Payments that cannot be applied</h2>
      <p>
        If a listing was removed or disabled before your payment cleared, the payment cannot be
        applied to any rank. We show: &ldquo;{VOID_MESSAGE}&rdquo; It is{" "}
        <strong>refunded in full</strong>, automatically where supported, otherwise after a short
        manual review.
      </p>

      <h2>Failed, cancelled and pending payments</h2>
      <p>
        If checkout fails, is cancelled, or never completes, no charge is captured and there is
        nothing to refund. Any temporary authorisation is released by your bank.
      </p>

      <h2>Refunded and disputed bids</h2>
      <p>
        If a confirmed bid is later refunded (for example following a payment dispute or an admin
        action for fraud), that contribution is subtracted from the profile&apos;s lifetime total and
        the boards are recalculated.
      </p>

      <h2>Fraud and abuse</h2>
      <p>
        We may refund and remove any listing associated with fraudulent payments, chargeback abuse,
        or prohibited content, and may decline future bids from the same source.
      </p>

      <h2>How to request a review</h2>
      <p>
        Use the <Link href="/contact">contact page</Link> with the email you used at checkout and the
        Instagram handle you bid on. We aim to respond within a few business days.
      </p>
    </Prose>
  );
}
