import Link from "next/link";
import { AFFILIATION_DISCLAIMER, FOOTER_NAV, SITE_NAME, SOCIAL_LINKS } from "@/lib/site";
import { IconX, IconInstagram } from "@/components/icons";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";

const SOCIAL_ICONS = { x: IconX, instagram: IconInstagram };

export async function SiteFooter() {
  const settings = await getSettings();
  return (
    <footer className="mt-16 pb-10 text-center">
      <p className="mx-auto max-w-xl px-4 text-xs leading-normal text-muted-foreground text-balance">
        <span className="font-semibold text-foreground">OUTBID INSTAGRAM.</span> All-time board.
        Ranked by lifetime spend on the listing. This board never resets. New listings from{" "}
        {formatMoney(settings.startingBidCents, settings.currency)}; taking #1 costs{" "}
        {formatMoney(settings.takeTopIncrementCents, settings.currency)} over the leader.{" "}
        Nobody&apos;s rank is safe — you can always be outbid back.
      </p>
      <nav aria-label="Footer" className="mt-5 text-sm text-muted-foreground">
        {FOOTER_NAV.map((item, i) => (
          <span key={item.href}>
            {i > 0 && " · "}
            <Link
              href={item.href}
              className="text-primary transition-colors hover:text-primary/80"
            >
              {item.label}
            </Link>
          </span>
        ))}
      </nav>
      {SOCIAL_LINKS.length > 0 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          {SOCIAL_LINKS.map((s) => {
            const Icon = SOCIAL_ICONS[s.icon];
            return (
              <a
                key={s.href}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="grid size-8 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                <Icon className="size-4" />
              </a>
            );
          })}
        </div>
      )}
      <p className="mx-auto mt-5 max-w-2xl px-4 text-xs leading-relaxed text-muted-foreground">
        {AFFILIATION_DISCLAIMER} “Instagram” is a trademark of Meta Platforms, Inc. Bids are
        voluntary payments to appear on the {SITE_NAME} leaderboard and confer no rights over any
        Instagram account.
      </p>
      <p className="mt-3 text-xs text-muted-foreground">
        © {new Date().getFullYear()} {SITE_NAME}
      </p>
    </footer>
  );
}
