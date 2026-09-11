import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import {
  getBoard,
  getTodayBoard,
  getAllTimeBoard,
  getActiveCategoriesForForm,
  type BoardKind,
} from "@/lib/leaderboard";
import { TopSidebar } from "@/components/top-sidebar";
import { getRecentActivity } from "@/lib/activity";
import { recentDayKeys, utcDateKey } from "@/lib/date-windows";
import { ClaimForm } from "@/components/claim-form";
import { BoardTabs } from "@/components/board-tabs";
import { Pagination } from "@/components/pagination";
import {
  TierList,
  FlatList,
  TodayStrip,
  TopDivider,
  SeeAllLink,
  LeaderboardList,
} from "@/components/leaderboard-list";
import { ActivityStrip, type ActivityItem } from "@/components/activity-feed";
import { formatMoney } from "@/lib/money";
import { AFFILIATION_DISCLAIMER } from "@/lib/site";
import { cn } from "@/components/ui";

const BOARD_COPY: Record<BoardKind, { label: string; blurb: string }> = {
  all: {
    label: "All-time",
    blurb: "Ranked by lifetime spend on the listing. This board never resets.",
  },
  today: {
    label: "Today",
    blurb: "A rolling 24 hours. Each payment counts from when it clears, then drops off a day later.",
  },
  daily: {
    label: "Daily",
    blurb: "A single UTC calendar day. The current day stays live; past days freeze as an archive.",
  },
};

export async function BoardScreen({
  board,
  page = 1,
  categorySlug,
  dateKey,
}: {
  board: BoardKind;
  page?: number;
  categorySlug?: string;
  dateKey?: string;
}) {
  const pageSize = 25;
  const settings = await getSettings();
  const isPage1 = page === 1 && !categorySlug;

  const [result, formCategories, activity, today, top10] = await Promise.all([
    getBoard(board, { categorySlug, page, pageSize, dateKey }),
    getActiveCategoriesForForm(),
    getRecentActivity(5),
    board === "all" ? getTodayBoard({ pageSize: 3 }) : Promise.resolve(null),
    // Quick-glance all-time reference panel next to the claim form —
    // independent of whichever board this page itself is showing.
    isPage1 ? getAllTimeBoard({ pageSize: 10 }) : Promise.resolve(null),
  ]);

  const activityItems: ActivityItem[] = activity.map((e) => ({
    id: e.id,
    type: e.type,
    username: e.username,
    categorySlug: e.categorySlug,
    rank: e.rank,
    amountCents: e.amountCents,
    totalCents: e.totalCents,
    currency: e.currency,
    createdAt: e.createdAt,
  }));

  const rows = result.rows;
  const homeLike = board === "all";

  const mkHref = (patch: Record<string, string | undefined>) => {
    const base =
      board === "all"
        ? "/"
        : board === "today"
          ? "/today"
          : dateKey && dateKey !== utcDateKey()
            ? `/daily/${dateKey}`
            : "/daily";
    const params = new URLSearchParams();
    const merged: Record<string, string | undefined> = { category: categorySlug, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const qs = params.toString();
    return `${base}${qs ? `?${qs}` : ""}`;
  };

  const activeCategory = formCategories.find((c) => c.slug === categorySlug);
  const dayKeys = board === "daily" ? recentDayKeys(8) : [];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pt-3 pb-16 md:gap-8 md:pt-4">
      <div className="flex flex-col gap-5 md:gap-6">
        <BoardTabs active={board} showDaily={settings.dailyBoardEnabled} />

        {isPage1 && (
          <div className={cn(top10 && top10.rows.length > 0 && "lg:grid lg:grid-cols-[1fr_280px] lg:items-start lg:gap-6")}>
            <ClaimForm
              categories={formCategories}
              claimTopCents={result.claimTopCents}
              startingBidCents={settings.startingBidCents}
              minIncrementCents={settings.minIncrementCents}
              currency={settings.currency}
            />
            {top10 && <TopSidebar rows={top10.rows} className="mt-6 lg:mt-0 lg:translate-y-[267px]" />}
          </div>
        )}

        <p className="mx-auto max-w-xl text-center text-xs leading-normal text-muted-foreground text-balance">
          <span className="font-semibold text-foreground">OUTBID INSTAGRAM.</span>{" "}
          {activeCategory ? `${activeCategory.name} — ${BOARD_COPY[board].label}. ` : `${BOARD_COPY[board].label} board. `}
          {BOARD_COPY[board].blurb} New listings from{" "}
          {formatMoney(settings.startingBidCents, settings.currency)}; taking #1 costs{" "}
          {formatMoney(settings.takeTopIncrementCents, settings.currency)} over the leader.
        </p>

        {board === "daily" && (
          <div className="obi-scroll-x -mx-4 flex justify-center gap-1.5 overflow-x-auto px-4">
            {dayKeys.map((key) => {
              const isToday = key === utcDateKey();
              const active = (dateKey ?? utcDateKey()) === key;
              return (
                <Link
                  key={key}
                  href={isToday ? "/daily" : `/daily/${key}`}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:bg-muted",
                  )}
                >
                  {isToday ? "Today" : key.slice(5)}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div id="leaderboard" className="flex scroll-mt-6 flex-col">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            {board === "all"
              ? "No profiles ranked yet. Be the first — paste your @username above."
              : "Nothing has been paid in this window yet."}
          </div>
        ) : homeLike && isPage1 ? (
          <>
            <TierList rows={rows.slice(0, 3)} />
            <TodayStrip rows={today?.rows ?? []} seeAllHref="/today" />
            {rows.length > 3 && <FlatList rows={rows.slice(3, 10)} />}
            {rows.length > 10 && <ActivityStrip items={activityItems} />}
            {rows.length > 10 && <FlatList rows={rows.slice(10)} offset={3} />}
            {result.total >= 20 && <TopDivider n={Math.min(rows.length, pageSize)} />}
          </>
        ) : (
          <LeaderboardList rows={rows} tiered={page === 1} />
        )}

        <div className="mt-3">
          <Pagination
            page={page}
            totalPages={result.totalPages}
            total={result.total}
            pageSize={pageSize}
            hrefForPage={(p) => mkHref({ page: p > 1 ? String(p) : undefined })}
          />
        </div>
      </div>

      {board === "all" && isPage1 && (
        <>
          <section className="mt-4 flex w-full justify-center">
            <div className="flex w-full max-w-3xl flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:gap-6">
              <p className="min-w-0 text-base leading-snug text-muted-foreground sm:flex-1 sm:text-lg">
                A public, pay-to-rank leaderboard for Instagram profiles.{" "}
                <Link href="/how-it-works" className="font-medium text-primary hover:text-primary/80">
                  How it works →
                </Link>
              </p>
              <HomeStats currency={settings.currency} />
            </div>
          </section>
          <p className="text-center text-xs text-muted-foreground">{AFFILIATION_DISCLAIMER}</p>
        </>
      )}

      {!isPage1 && (
        <div className="flex justify-center">
          <SeeAllLink href={mkHref({ page: undefined, category: undefined })} label="Reset filters" />
        </div>
      )}
    </div>
  );
}

async function HomeStats({ currency }: { currency: string }) {
  const [revenueAgg, activeCount] = await Promise.all([
    prisma.payment.aggregate({ _sum: { amountCents: true }, where: { status: "paid" } }),
    prisma.listing.count({ where: { status: "ACTIVE" } }),
  ]);
  return (
    <div className="grid w-full grid-cols-2 gap-3 sm:w-[min(100%,22rem)] sm:shrink-0">
      <Stat value={formatMoney(revenueAgg._sum.amountCents ?? 0, currency)} label="confirmed bids value" />
      <Stat value={String(activeCount)} label="profiles ranked" />
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-card px-3 py-3 text-center sm:px-4">
      <p className="flex h-8 items-center justify-center font-mono text-xl font-semibold tracking-tight tabular-nums sm:h-9 sm:text-2xl">
        {value}
      </p>
      <p className="mt-1 truncate text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
