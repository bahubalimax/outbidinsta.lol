import type { Metadata } from "next";
import Link from "next/link";
import { Prose } from "@/components/prose";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Frequently asked questions about OutBidInsta.",
  alternates: { canonical: "/faq" },
};

const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: "What am I actually paying for?",
    a: "A position on the OutBidInsta leaderboard for a given Instagram profile. It is a voluntary payment for visibility — it does not give you any rights over the Instagram account.",
  },
  {
    q: "Do I need to own the Instagram profile?",
    a: "No. Anyone can list any public profile. If you are the profile owner and want a listing removed, contact us.",
  },
  {
    q: "Do you need my Instagram login?",
    a: "Never. We do not ask for passwords, we do not log in to Instagram, and we do not scrape it aggressively. A listing can exist with just the username, URL, category and bid.",
  },
  {
    q: "When does my rank update?",
    a: "Only after our payment provider sends us a verified confirmation. A browser saying 'payment successful' is never enough.",
  },
  {
    q: "Someone outbid the same amount right after me. What happens?",
    a: (
      <>
        The first confirmed payment wins the position. If yours can no longer claim the rank, it is
        reviewed and refunded per the <Link href="/refund-policy">Refund Policy</Link>.
      </>
    ),
  },
  {
    q: "Can I get a refund?",
    a: (
      <>
        Superseded bids (paid too late to claim the position) are refunded. Confirmed winning bids
        are generally non-refundable. See the <Link href="/refund-policy">Refund Policy</Link>.
      </>
    ),
  },
  {
    q: "Is this affiliated with Instagram or Meta?",
    a: "No. OutBidInsta is an independent platform and is not affiliated with, endorsed by, or sponsored by Instagram or Meta.",
  },
];

export default function FaqPage() {
  return (
    <Prose title="FAQ">
      <div className="space-y-5">
        {FAQ.map((item) => (
          <div key={item.q}>
            <h2>{item.q}</h2>
            <p>{item.a}</p>
          </div>
        ))}
      </div>
    </Prose>
  );
}
