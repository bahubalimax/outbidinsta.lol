import Link from "next/link";

/**
 * Small "live" indicator in the header. Both numbers (when shown) are real
 * pageview counts — "active" in the last 5 minutes, "visitors today" over a
 * rolling 24h (see getHeaderStats in src/lib/analytics.ts) — never
 * fabricated. At near-zero traffic we fall back to the plain label instead
 * of showing bare zeros, which would read as broken rather than honest.
 */
export function LiveVisitorPill({
  activeNow = 0,
  visitorsToday = 0,
}: {
  activeNow?: number;
  visitorsToday?: number;
}) {
  return (
    <Link
      href="/stats"
      className="inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-transparent px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
    >
      <span className="relative inline-flex size-2 shrink-0">
        <span className="obi-ping absolute inline-flex size-full rounded-full bg-live/50" />
        <span className="relative inline-flex size-2 rounded-full bg-live" />
      </span>
      {activeNow > 0 ? (
        <span className="tabular-nums">
          <span className="text-foreground">{activeNow}</span> online
        </span>
      ) : (
        <span>Live leaderboard</span>
      )}
      {visitorsToday > 0 && (
        <span className="tabular-nums">
          · <span className="text-foreground">{visitorsToday.toLocaleString()}</span> visitors today
        </span>
      )}
      <span className="text-foreground"> · stats →</span>
    </Link>
  );
}
