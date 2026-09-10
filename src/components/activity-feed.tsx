import Link from "next/link";
import { formatMoney } from "@/lib/money";
import { timeAgo } from "@/lib/format";
import { SeeAllLink, LeaderboardAvatar as Avatar } from "@/components/leaderboard-list";

export interface ActivityItem {
  id: string;
  type: "NEW_LISTING" | "CLAIM" | "RAISE";
  username: string;
  categorySlug: string | null;
  rank: number | null;
  amountCents: number | null;
  totalCents: number | null;
  currency: string;
  createdAt: string;
}

function summary(item: ActivityItem): string {
  const paid = item.amountCents != null ? formatMoney(item.amountCents, item.currency) : "";
  const total = item.totalCents != null ? formatMoney(item.totalCents, item.currency) : "";
  const rank = item.rank ? `#${item.rank}` : "the board";
  if (item.type === "NEW_LISTING") return `joined at ${rank} · ${total || paid}`;
  return `raised to ${rank} · +${paid}${total ? ` (${total} total)` : ""}`;
}

/** Compact strip used inside the homepage leaderboard. */
export function ActivityStrip({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className="my-4 md:my-5">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold tracking-[-0.02em]">
          <span className="relative inline-flex size-1.5 shrink-0" aria-hidden>
            <span className="obi-ping absolute inline-flex size-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
          </span>
          Latest activity
        </h2>
        <SeeAllLink href="/activity" label="More" />
      </div>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-5">
        {items.slice(0, 5).map((item) => (
          <li key={item.id} className="min-w-0">
            <Link
              href={`/profile/${item.username}`}
              className="grid h-full grid-cols-[auto_1fr] items-start gap-x-2 rounded-md bg-muted px-2.5 py-2 text-xs"
            >
              <Avatar username={item.username} className="size-5 !rounded-md" />
              <span className="min-w-0 leading-none">
                <span className="block truncate font-semibold">@{item.username}</span>
                <span className="mt-px block text-muted-foreground">{summary(item)}</span>
                <span className="mt-px block text-[10px] text-muted-foreground">
                  {timeAgo(item.createdAt)}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Full vertical feed used on /activity. */
export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity yet.</p>;
  }
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-2 px-4 py-3 text-sm">
          <span className="obi-pulse mt-0.5 size-1.5 shrink-0 rounded-full bg-live" />
          <span className="min-w-0 flex-1 truncate">
            <Link href={`/profile/${item.username}`} className="font-semibold hover:underline">
              @{item.username}
            </Link>{" "}
            <span className="text-muted-foreground">{summary(item)}</span>
          </span>
          <time className="shrink-0 text-xs text-muted-foreground" dateTime={item.createdAt}>
            {timeAgo(item.createdAt)}
          </time>
        </li>
      ))}
    </ul>
  );
}
