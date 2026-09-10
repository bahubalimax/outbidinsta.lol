import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { Prose } from "@/components/prose";
import { AFFILIATION_DISCLAIMER, SITE_NAME } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Rules",
  description: "How ranking, bidding and listings work on OutBidInsta.",
  alternates: { canonical: "/rules" },
};

export default async function RulesPage() {
  const s = await getSettings();
  const start = formatMoney(s.startingBidCents, s.currency);
  const inc = formatMoney(s.minIncrementCents, s.currency);
  const max = s.maxBidCents ? formatMoney(s.maxBidCents, s.currency) : "no fixed maximum";

  return (
    <Prose title="Rules">
      <p>
        {SITE_NAME} is a public leaderboard for Instagram profiles. Your rank on a profile is the
        amount of the highest <strong>confirmed</strong> paid bid on that profile — nothing else.
      </p>

      <h2>The boards</h2>
      <ul>
        <li>
          <strong>All-time</strong> is the main board. Profiles are ranked by their current confirmed
          bid and stay ranked until they are outbid.
        </li>
        <li>
          <strong>Today</strong> shows profiles that received a confirmed bid in the current UTC
          calendar day, ordered by their current bid.
        </li>
      </ul>

      <h2>How ranking works</h2>
      <ul>
        <li>The starting bid for a new profile is {start}. The maximum is {max}.</li>
        <li>
          Each new bid on a profile must be at least {inc} above that profile&apos;s current bid. The
          minimum is always computed on our server; the amount shown in your browser is a convenience
          only.
        </li>
        <li>
          Bidding {start} when the current bid is {start} is rejected. Bidding the same amount as the
          current bid is rejected. Bidding the minimum or higher is accepted.
        </li>
        <li>
          Already listed? Enter the same @handle or URL again to raise your bid. The new bid must be
          above the current bid; you pay the full new amount at checkout.
        </li>
        <li>
          If two bids for the same amount are paid, the first one confirmed by our payment provider
          keeps the position. The other is handled under the{" "}
          <Link href="/refund-policy">Refund Policy</Link>.
        </li>
      </ul>

      <h2>What you can list</h2>
      <ul>
        <li>A public Instagram profile, submitted as an @username or an instagram.com/… URL.</li>
        <li>Query strings and tracking parameters are ignored; the link is normalised to the canonical profile URL.</li>
        <li>
          No links to sexual or adult content, no harassment of private individuals, no impersonation,
          and no unlawful or infringing content.
        </li>
        <li>Link-shortener and redirect URLs are resolved to the profile they point at, or rejected.</li>
      </ul>

      <h2>Categories</h2>
      <p>
        Each profile sits in one category, chosen when it is first listed. If it is in the wrong
        category, ask us on the <Link href="/contact">contact page</Link> and an admin can move it.
      </p>

      <h2>After you pay</h2>
      <ul>
        <li>Your listing is public: username, Instagram link, category, current bid, bid count and dates.</li>
        <li>
          Only a <strong>verified</strong> payment confirmation claims a rank — never a browser
          saying &ldquo;success&rdquo;.
        </li>
        <li>
          Confirmed winning bids are generally non-refundable. Bids that were paid but could not
          claim the intended position are reviewed and refunded per the{" "}
          <Link href="/refund-policy">Refund Policy</Link>.
        </li>
        <li>
          Paying means you agree to the <Link href="/terms">Terms of Service</Link> and{" "}
          <Link href="/privacy">Privacy Policy</Link>.
        </li>
      </ul>

      <p className="text-xs text-muted-foreground">{AFFILIATION_DISCLAIMER}</p>
    </Prose>
  );
}
