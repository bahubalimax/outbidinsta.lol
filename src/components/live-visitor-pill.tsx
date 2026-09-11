import Link from "next/link";

/**
 * Small "live" indicator in the header. The number (when shown) is a real
 * count of pageviews in the last 5 minutes (see getActiveNow in
 * src/lib/analytics.ts) — never fabricated. At near-zero traffic we fall
 * back to the plain label instead of showing a bare "0", which would read
 * as broken rather than honest.
 */
export function LiveVisitorPill({ activeNow = 0 }: { activeNow?: number }) {
  return (
    <Link
      href="/activity"
      className="inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-transparent px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
    >
      <span className="relative inline-flex size-2 shrink-0">
        <span className="obi-ping absolute inline-flex size-full rounded-full bg-live/50" />
        <span className="relative inline-flex size-2 rounded-full bg-live" />
      </span>
      {activeNow > 0 ? (
        <span className="tabular-nums">
          {activeNow} active <span className="text-foreground">now</span>
        </span>
      ) : (
        <span>Live leaderboard</span>
      )}
      <span className="text-foreground"> · activity →</span>
    </Link>
  );
}
