import Link from "next/link";
import type { LeaderboardRow } from "@/lib/leaderboard";
import { formatMoney } from "@/lib/money";
import { LeaderboardAvatar as Avatar, SeeAllLink } from "@/components/leaderboard-list";
import { cn } from "@/components/ui";

const PODIUM_ORDER = [2, 1, 3] as const;
const STEP_HEIGHT: Record<1 | 2 | 3, string> = { 1: "h-16", 2: "h-11", 3: "h-8" };
const STEP_STYLE: Record<1 | 2 | 3, string> = {
  1: "border-primary/40 bg-primary/10 text-primary",
  2: "border-border bg-muted/70 text-muted-foreground",
  3: "border-border bg-muted/50 text-muted-foreground",
};

function PodiumSlot({ row, place }: { row?: LeaderboardRow; place: 1 | 2 | 3 }) {
  return (
    <div className="flex flex-1 flex-col items-center">
      {row ? (
        <Link href={`/profile/${row.username}`} className="group flex flex-col items-center gap-1">
          <span className="relative flex">
            {place === 1 && (
              <span
                className="absolute -top-3 left-1/2 -translate-x-1/2 text-sm"
                aria-hidden
              >
                👑
              </span>
            )}
            <Avatar
              username={row.username}
              src={row.avatarUrl}
              className="size-11 !rounded-full ring-2 ring-primary/25 transition-colors group-hover:ring-primary/50"
            />
          </span>
          <span className="max-w-[74px] truncate text-xs font-semibold">@{row.username}</span>
          <span className="text-[11px] font-bold text-primary tabular-nums">
            {formatMoney(row.spendCents, row.currency)}
          </span>
        </Link>
      ) : (
        <Link href="/#claim" className="flex flex-col items-center gap-1">
          <span className="grid size-11 place-items-center rounded-full border-2 border-dashed border-border text-sm text-muted-foreground">
            ?
          </span>
          <span className="text-xs font-medium text-muted-foreground italic">Open</span>
          <span className="text-[11px] font-semibold text-primary">claim #{place} →</span>
        </Link>
      )}
      <div
        className={cn(
          "mt-2 flex w-full items-start justify-center rounded-t-lg border border-b-0 pt-1 text-sm font-extrabold",
          STEP_HEIGHT[place],
          STEP_STYLE[place],
        )}
      >
        {place}
      </div>
    </div>
  );
}

/**
 * Compact "Top 10 · All-time" reference panel shown next to the claim form
 * on desktop — a quick-glance list of the current leaders while you're
 * about to bid. Homepage only (board === "all"), independent of the main
 * board content. Hidden below the lg breakpoint; the full, detailed
 * leaderboard is always available in the main list/pages.
 */
export function TopSidebar({ rows, className }: { rows: LeaderboardRow[]; className?: string }) {
  if (rows.length === 0) return null;
  const byRank = (rank: number) => rows.find((r) => r.rank === rank);
  const rest = rows.filter((r) => r.rank > 3);

  return (
    <aside className={cn("hidden rounded-2xl border border-border bg-card p-4 lg:block", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <span aria-hidden>🏆</span> All-time ranking
        </h2>
        <SeeAllLink href="/leaderboard" />
      </div>

      <div className="mb-4 flex items-end gap-2 border-b border-border pb-4">
        {PODIUM_ORDER.map((place) => (
          <PodiumSlot key={place} place={place} row={byRank(place)} />
        ))}
      </div>

      {rest.length > 0 && (
        <ol className="flex flex-col gap-1">
          {rest.map((row) => (
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
      )}
    </aside>
  );
}
