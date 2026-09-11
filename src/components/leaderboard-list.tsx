import Link from "next/link";
import type { LeaderboardRow } from "@/lib/leaderboard";
import { formatMoney } from "@/lib/money";
import { timeAgo } from "@/lib/format";
import { cn } from "@/components/ui";
import { IconInstagram, IconTag, IconChevronRight } from "@/components/icons";
import { RankBadge } from "@/components/rank-badge";

const TIER_BG = ["bg-primary/[0.14]", "bg-primary/[0.08]", "bg-primary/[0.04]"] as const;
const TIER_AVATAR = ["size-11 md:size-12", "size-10 md:size-11", "size-9 md:size-10"] as const;

function Avatar({
  username,
  src,
  className,
}: {
  username: string;
  src?: string | null;
  className?: string;
}) {
  const initial = username.replace(/[^a-z0-9]/gi, "").slice(0, 1).toUpperCase() || "?";
  if (src) {
    return (
      <img
        src={src}
        alt=""
        loading="lazy"
        className={cn("shrink-0 rounded-lg border border-border object-cover", className)}
      />
    );
  }
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-lg bg-primary/10 font-semibold text-primary",
        className,
      )}
      aria-hidden
    >
      {initial}
    </span>
  );
}

function MetaRow({ row }: { row: LeaderboardRow }) {
  return (
    <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] md:text-xs">
      <Link
        href={`/category/${row.categorySlug}`}
        className="pointer-events-auto relative z-20 inline-flex items-center gap-1 font-semibold text-foreground transition-colors hover:text-primary"
      >
        <IconTag className="size-3" />
        {row.categoryName}
      </Link>
      <span className="text-muted-foreground/45" aria-hidden>·</span>
      <span className="text-muted-foreground/70">
        {row.lastBidAt ? timeAgo(row.lastBidAt) : timeAgo(row.createdAt)}
      </span>
      <span className="text-muted-foreground/45" aria-hidden>·</span>
      <span className="font-medium text-muted-foreground">@{row.username}</span>
      <span className="text-muted-foreground/45" aria-hidden>·</span>
      <span className="tabular-nums text-muted-foreground/70">
        {row.bidCount} bid{row.bidCount === 1 ? "" : "s"}
      </span>
      {row.spendCents !== row.lifetimeTotalCents && (
        <>
          <span className="text-muted-foreground/45" aria-hidden>·</span>
          <span className="tabular-nums text-muted-foreground/70">
            lifetime {formatMoney(row.lifetimeTotalCents, row.currency)}
          </span>
        </>
      )}
      <span className="text-muted-foreground/45" aria-hidden>·</span>
      <span className="font-medium text-muted-foreground/70">details</span>
    </p>
  );
}

function ClaimPill({ row, edge }: { row: LeaderboardRow; edge: "center" | "top" }) {
  return (
    <span
      className={cn(
        "brand-gradient-bg pointer-events-none absolute left-1/2 z-20 -translate-x-1/2 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-white opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100",
        edge === "center" ? "top-0 -translate-y-1/2" : "top-1.5",
      )}
    >
      claim this rank for {formatMoney(row.claimHereCents, row.currency)}
    </span>
  );
}

function RowLink({ username }: { username: string }) {
  return (
    <Link
      href={`/profile/${username}`}
      aria-label={`View @${username}`}
      className="absolute inset-0 z-0 rounded-[inherit] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    />
  );
}

function TierRow({ row, tier }: { row: LeaderboardRow; tier: 0 | 1 | 2 }) {
  return (
    <li>
      <article className="group relative scroll-mt-6 rounded-xl md:rounded-2xl">
        <RowLink username={row.username} />
        <div
          className={cn(
            "pointer-events-none relative z-10 overflow-hidden rounded-lg md:rounded-xl",
            TIER_BG[tier],
          )}
        >
          <div className="flex items-start gap-2 px-2.5 py-2 md:gap-2.5 md:px-3 md:py-2.5">
            <div className="flex shrink-0 items-center md:gap-2.5">
              <span className="relative hidden md:inline-flex">
                {row.rank === 1 && (
                  <span className="obi-pulse absolute inset-0 rounded-lg bg-amber-400/30" aria-hidden />
                )}
                <RankBadge rank={row.rank} className="relative" />
              </span>
              <Avatar username={row.username} src={row.avatarUrl} className={TIER_AVATAR[tier]} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                  <RankBadge rank={row.rank} className="mr-1.5 h-6 min-w-6 text-xs md:hidden" />
                  {row.displayName ? `${row.displayName} · @${row.username}` : `@${row.username}`}
                </p>
                <p className="shrink-0 text-sm font-semibold text-primary tabular-nums">
                  {formatMoney(row.spendCents, row.currency)}
                </p>
              </div>
              <p className="line-clamp-1 text-xs text-muted-foreground/70">
                {row.bio ??
                  `Ranked #${row.rank} in ${row.categoryName}. Claim this rank for ${formatMoney(
                    row.claimHereCents,
                    row.currency,
                  )}.`}
              </p>
              <MetaRow row={row} />
            </div>
          </div>
        </div>
        <ClaimPill row={row} edge="center" />
      </article>
    </li>
  );
}

function FlatRow({ row, first }: { row: LeaderboardRow; first?: boolean }) {
  return (
    <div
      className={cn(
        "group relative scroll-mt-6 px-3 md:px-4",
        !first && "border-t border-border",
      )}
    >
      <RowLink username={row.username} />
      <div className="pointer-events-none relative z-10 flex items-start gap-2 py-2 transition-colors group-hover:text-primary md:gap-2.5 md:py-2.5">
        <div className="flex shrink-0 items-center md:gap-2.5">
          <span className="hidden min-w-8 items-center justify-center text-sm font-medium text-muted-foreground tabular-nums md:inline-flex">
            #{row.rank}
          </span>
          <Avatar username={row.username} src={row.avatarUrl} className="size-8 md:size-10" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <p className="min-w-0 flex-1 truncate text-sm font-medium">
              <span className="mr-1.5 font-medium text-muted-foreground tabular-nums md:hidden">
                #{row.rank}
              </span>
              {row.displayName ? `${row.displayName} · @${row.username}` : `@${row.username}`}
            </p>
            <p className="shrink-0 text-sm font-semibold text-primary tabular-nums">
              {formatMoney(row.spendCents, row.currency)}
            </p>
          </div>
          <p className="line-clamp-1 text-xs text-muted-foreground/70">
            {row.bio ?? `Ranked #${row.rank} in ${row.categoryName}.`}
          </p>
          <MetaRow row={row} />
        </div>
      </div>
      <ClaimPill row={row} edge="top" />
    </div>
  );
}

export function TierList({ rows }: { rows: LeaderboardRow[] }) {
  return (
    <ol className="flex flex-col gap-2 pt-1 md:pt-1.5">
      {rows.map((row, i) => (
        <TierRow key={row.id} row={row} tier={Math.min(i, 2) as 0 | 1 | 2} />
      ))}
    </ol>
  );
}

export function FlatList({ rows, offset = 0 }: { rows: LeaderboardRow[]; offset?: number }) {
  return (
    <div>
      {rows.map((row, i) => (
        <FlatRow key={row.id} row={row} first={i === 0 && offset === 0} />
      ))}
    </div>
  );
}

export function LeaderboardList({
  rows,
  tiered = true,
  emptyLabel = "No listings yet. Be the first to claim a rank.",
}: {
  rows: LeaderboardRow[];
  tiered?: boolean;
  emptyLabel?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }
  const doTier = tiered && rows[0]?.rank === 1;
  const top = doTier ? rows.slice(0, 3) : [];
  const rest = doTier ? rows.slice(3) : rows;
  return (
    <div className="flex flex-col gap-4">
      {top.length > 0 && <TierList rows={top} />}
      {rest.length > 0 && <FlatList rows={rest} offset={top.length} />}
    </div>
  );
}

export function SeeAllLink({ href, label = "See all" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-primary transition-opacity hover:opacity-80"
    >
      {label}
      <IconChevronRight className="size-3" />
    </Link>
  );
}

export function TodayStrip({
  rows,
  seeAllHref,
  title = "Today's top ranking",
}: {
  rows: LeaderboardRow[];
  seeAllHref: string;
  title?: string;
}) {
  if (rows.length === 0) return null;
  return (
    <section className="-mx-4 my-2 px-4 py-2 md:mx-0 md:my-2.5 md:py-3">
      <div className="mb-2 flex items-center justify-between gap-3 md:mb-2.5">
        <h2 className="text-sm font-semibold tracking-[-0.02em]">
          <Link href={seeAllHref} className="inline-flex items-center gap-1.5">
            <span className="relative inline-flex size-1.5 shrink-0" aria-hidden>
              <span className="obi-ping absolute inline-flex size-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
            </span>
            {title}
          </Link>
        </h2>
        <SeeAllLink href={seeAllHref} />
      </div>
      <ol className="flex flex-col gap-1.5 md:grid md:grid-cols-3 md:gap-3">
        {rows.slice(0, 3).map((row, i) => (
          <li key={row.id} className="min-w-0">
            <Link
              href={`/profile/${row.username}`}
              className="flex items-center gap-2 rounded-xl bg-primary/5 px-3 py-2 text-xs transition-colors hover:bg-primary/10 md:h-full md:gap-2.5 md:px-3.5 md:py-3"
            >
              <span className="flex shrink-0 items-center gap-1.5 md:gap-2">
                <span className="text-[11px] font-semibold text-muted-foreground tabular-nums">
                  #{i + 1}
                </span>
                <Avatar username={row.username} src={row.avatarUrl} className="size-7" />
              </span>
              <span className="min-w-0 flex-1 space-y-0.5 leading-snug">
                <span className="flex items-baseline gap-2">
                  <span className="min-w-0 flex-1 truncate font-semibold">@{row.username}</span>
                  <span className="shrink-0 font-semibold text-primary tabular-nums">
                    {formatMoney(row.spendCents, row.currency)}
                  </span>
                </span>
                <span className="block truncate text-muted-foreground/70">
                  {row.categoryName} · {row.bidCount} bid{row.bidCount === 1 ? "" : "s"}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function TopDivider({ n }: { n: number }) {
  return (
    <div
      role="separator"
      aria-label={`End of top ${n}`}
      className="flex items-center gap-3 px-3 py-5 md:gap-4 md:px-4 md:py-7"
    >
      <span className="h-0.5 flex-1 rounded-full bg-primary/30" />
      <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-primary uppercase md:px-3 md:text-xs">
        Top {n}
      </span>
      <span className="h-0.5 flex-1 rounded-full bg-primary/30" />
    </div>
  );
}

export { Avatar as LeaderboardAvatar };
export { IconInstagram };
