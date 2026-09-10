import Link from "next/link";
import { AFFILIATION_DISCLAIMER, FOOTER_NAV, SITE_NAME } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-16 pb-10 text-center">
      <nav aria-label="Footer" className="text-sm text-muted-foreground">
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
