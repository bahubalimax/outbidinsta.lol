import type { Metadata } from "next";
import Link from "next/link";
import { Prose } from "@/components/prose";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <Prose title="Privacy Policy" updated="2026-09-11">
      <p>This policy explains what {SITE_NAME} collects and why.</p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Email address</strong> — provided by you at checkout, used to identify your bids
          and send receipts.
        </li>
        <li>
          <strong>Bid and payment records</strong> — amounts, currency, status, and a payment
          reference from our payment provider. We do not store card numbers.
        </li>
        <li>
          <strong>Instagram profile identifiers</strong> — the public username and URL you submit.
          We do not collect Instagram credentials and do not aggressively scrape Instagram.
        </li>
        <li>
          <strong>Basic technical data</strong> — IP address and request metadata, used for rate
          limiting, fraud prevention, and security.
        </li>
      </ul>

      <h2>What is public</h2>
      <p>
        Leaderboard entries (username, category, current bid, bid count, dates) and the activity feed
        are public. The activity feed never shows your email, payment details, or other personal
        information.
      </p>

      <h2>Payment processing</h2>
      <p>
        Payments are processed by our third-party payment provider. Card and billing details are
        handled by them under their own privacy terms; we receive only a status and a reference.
      </p>

      <h2>Retention</h2>
      <p>
        We keep bid, payment, and webhook records for as long as needed for accounting, dispute
        resolution, and legal compliance.
      </p>

      <h2>Your choices</h2>
      <p>
        To request access to or deletion of your data, or removal of a listing, use the{" "}
        <Link href="/contact">contact page</Link>. We decline non-essential cookies by default and do
        not sell personal data.
      </p>
    </Prose>
  );
}
