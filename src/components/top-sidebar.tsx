import Link from "next/link";
import type { LeaderboardRow } from "@/lib/leaderboard";
import { formatMoney } from "@/lib/money";
import { LeaderboardAvatar as Avatar, SeeAllLink } from "@/components/leaderboard-list";
import { cn } from "@/components/ui";

/**
 * Compact "Top 10 · All-time" reference panel shown next to the claim form
 * on desktop — a quick-glance list of the current leaders while you're
 * about to bid, independent of whichever board (Today/Category/etc.) the
 * page itself is showing. Hidden below the lg breakpoint; the full,
 * detailed leaderboard is always available in the main list/pages.
 */
export function TopSidebar({ rows, className }: { rows: LeaderboardRow[]; className?: string }) {
  if (rows.length === 0) return null;
  return (
    <aside className={cn("hidden rounded-2xl border border-border bg-card p-4 lg:block", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <span aria-hidden>🏆</span> All-time ranking
        </h2>
        <SeeAllLink href="/leaderboard" />
      </div>
      <ol className="flex flex-col gap-1">
        {rows.map((row) => (
          <li key={row.id}>
            <Link
              href={`/profile/${row.username}`}
              className="flex items-center gap-2 rounded-lg px-1.5 py-1.5 text-sm transition-colors hover:bg-muted"
            >
              <span className="w-4 shrink-0 text-xs font-semibold text-muted-foreground tabular-nums">
                {row.rank}
              </span>
              <Avatar username={row.username} src={row.avatarUrl} className="size-7 shrink-0" />
              <span className="min-w-0 flex-1 truncate font-medium">@{row.username}</span>
              <span className="shrink-0 text-xs font-semibold text-primary tabular-nums">
                {formatMoney(row.spendCents, row.currency)}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </aside>
  );
}
