/** Public, non-secret site constants. Safe to import anywhere. */

export const SITE_NAME = "OutBidInsta";
export const SITE_TAGLINE = "Outbid Instagram profiles";
export const SITE_DESCRIPTION =
  "Put your Instagram profile on the leaderboard. Outbid everyone else — the highest confirmed paid bid takes #1.";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
).replace(/\/$/, "");

export const AFFILIATION_DISCLAIMER =
  "OutBidInsta is an independent platform and is not affiliated with Instagram or Meta.";

export const PRIMARY_NAV: { href: string; label: string; hideOnMobile?: boolean }[] = [
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/categories", label: "Categories" },
  { href: "/activity", label: "Activity" },
  { href: "/how-it-works", label: "How it works", hideOnMobile: true },
];

export const FOOTER_NAV = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/rules", label: "Rules" },
  { href: "/faq", label: "FAQ" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/refund-policy", label: "Refund policy" },
  { href: "/contact", label: "Contact" },
];

export const SOCIAL_LINKS: { href: string; label: string }[] = [
  { href: "https://x.com/outbidinsta", label: "X (Twitter)" },
];

export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
