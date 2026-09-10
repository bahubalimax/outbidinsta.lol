import type { Metadata } from "next";
import Link from "next/link";
import { Prose } from "@/components/prose";
import { SITE_NAME, AFFILIATION_DISCLAIMER } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: "What OutBidInsta is and how it works.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <Prose title="About">
      <p>
        {SITE_NAME} is a public, pay-to-rank leaderboard for Instagram profiles. There are no ads and
        no algorithm — your rank is simply the total you have paid. Pay more than the profile above
        you and you move up.
      </p>
      <h2>Three boards</h2>
      <p>
        <strong>All-time</strong> ranks by lifetime spend and never resets. <strong>Today</strong> is
        a rolling 24 hours. <strong>Daily</strong> is a single UTC calendar day, with past days kept
        as a frozen archive.
      </p>
      <h2>Fair by design</h2>
      <p>
        Every minimum is computed on the server, and a rank only changes after a payment is verified
        by our payment provider — never from a browser. See the{" "}
        <Link href="/rules">Rules</Link>, <Link href="/how-it-works">How it works</Link>, and{" "}
        <Link href="/refund-policy">Refund Policy</Link>.
      </p>
      <p className="text-xs text-muted-foreground">{AFFILIATION_DISCLAIMER}</p>
    </Prose>
  );
}
