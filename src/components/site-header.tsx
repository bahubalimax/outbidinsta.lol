import { Suspense } from "react";
import Link from "next/link";
import { PRIMARY_NAV } from "@/lib/site";
import { ThemeToggle } from "@/components/theme-toggle";
import { CategoryStrip } from "@/components/category-strip";
import { LiveVisitorPill } from "@/components/live-visitor-pill";

export function SiteHeader({
  categories,
}: {
  categories: { name: string; slug: string }[];
}) {
  return (
    <header className="w-full border-b border-border/70">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 pt-6 pb-3.5 md:pb-4">
        <div className="flex w-full items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <Link
              href="/"
              className="inline-flex shrink-0 items-center gap-1.5 text-[22px] font-semibold tracking-[-0.04em]"
            >
              <svg viewBox="0 0 36 28" fill="none" aria-hidden className="h-[1em] w-auto">
                <rect x="22" y="0" width="14" height="6" rx="3" className="fill-primary" />
                <rect x="12" y="11" width="24" height="6" rx="3" className="fill-foreground" />
                <rect x="0" y="22" width="36" height="6" rx="3" className="fill-foreground" />
              </svg>
              <span>
                OutBid<span className="text-primary">Insta</span>
              </span>
            </Link>
            <div className="hidden min-w-0 md:block">
              <LiveVisitorPill />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <nav aria-label="Main">
              <ul className="flex items-center gap-3 text-xs sm:gap-5 sm:text-sm">
                {PRIMARY_NAV.map((item) => (
                  <li key={item.href} className={item.hideOnMobile ? "hidden md:block" : ""}>
                    <Link
                      href={item.href}
                      className="font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <ThemeToggle />
          </div>
        </div>

        <Suspense
          fallback={<div className="h-9 w-full rounded-full bg-muted" aria-hidden />}
        >
          <CategoryStrip categories={categories} />
        </Suspense>
      </div>
    </header>
  );
}
