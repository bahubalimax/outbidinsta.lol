import Link from "next/link";

/**
 * Small "live" indicator in the header. Deliberately shows no fabricated
 * visitor/online counts — just links to the public activity feed.
 */
export function LiveVisitorPill() {
  return (
    <Link
      href="/activity"
      className="inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-transparent px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
    >
      <span className="relative inline-flex size-2 shrink-0">
        <span className="obi-ping absolute inline-flex size-full rounded-full bg-live/50" />
        <span className="relative inline-flex size-2 rounded-full bg-live" />
      </span>
      <span>Live leaderboard</span>
      <span className="text-foreground"> · activity →</span>
    </Link>
  );
}
