import type { Metadata } from "next";
import Link from "next/link";
import { Prose } from "@/components/prose";
import { SITE_NAME, AFFILIATION_DISCLAIMER } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <Prose title="Terms of Service" updated="2026-09-11">
      <p>
        These terms govern your use of {SITE_NAME} (the &ldquo;Service&rdquo;). By placing a bid or
        using the Service you agree to them.
      </p>

      <h2>1. What the Service is</h2>
      <p>
        {SITE_NAME} is a public, pay-to-rank leaderboard. Paying places an Instagram profile
        identifier at a rank determined by the amount of the highest confirmed paid bid. Payment buys
        placement and visibility only. It grants no ownership, license, or control over any Instagram
        account, and no guarantee of traffic, followers, or results.
      </p>

      <h2>2. Bids and payments</h2>
      <ul>
        <li>The minimum next bid for any profile is calculated by us on the server.</li>
        <li>
          A bid becomes effective only after our payment provider sends a verified confirmation. A
          browser-side &ldquo;success&rdquo; is not sufficient.
        </li>
        <li>
          If a confirmed payment can no longer claim the intended position because another bid was
          confirmed first, it is handled under the <Link href="/refund-policy">Refund Policy</Link>.
        </li>
      </ul>

      <h2>3. Listings and content</h2>
      <p>
        You may list public Instagram profiles. You must not list private individuals in a harassing
        manner, impersonate others, or submit unlawful, infringing, or misleading content. We may
        edit, disable, recategorise, or remove any listing at our discretion, including for suspected
        fraud or chargeback abuse.
      </p>

      <h2>4. Acceptable use</h2>
      <p>
        No automated abuse, scraping of the Service, payment fraud, or attempts to manipulate the
        leaderboard outside the bidding mechanism.
      </p>

      <h2>5. Disclaimers</h2>
      <p>
        The Service is provided &ldquo;as is&rdquo; without warranties. To the maximum extent
        permitted by law, {SITE_NAME} is not liable for indirect or consequential damages, and total
        liability is limited to the amount you paid in the 30 days before the claim.
      </p>

      <h2>6. Affiliation</h2>
      <p>{AFFILIATION_DISCLAIMER} All trademarks are the property of their respective owners.</p>

      <h2>7. Changes</h2>
      <p>We may update these terms; material changes will be reflected by the date above.</p>

      <h2>8. Contact</h2>
      <p>
        Questions: <Link href="/contact">contact page</Link>.
      </p>
    </Prose>
  );
}
