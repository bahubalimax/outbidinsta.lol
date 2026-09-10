import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSettings, toBiddingRules } from "@/lib/settings";
import { claimRankTargetCents } from "@/lib/bidding";
import { rollingWindow, utcDayRange, parseUtcDateKey } from "@/lib/date-windows";

export type BoardKind = "all" | "today" | "daily";

export interface LeaderboardRow {
  rank: number;
  id: string;
  username: string;
  instagramUrl: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  categoryName: string;
  categorySlug: string;
  /** Amount shown for this row on this board (lifetime for all-time, window sum otherwise). */
  spendCents: number;
  /** Listing lifetime total, always. */
  lifetimeTotalCents: number;
  /** Amount to pay to claim this exact rank on this board. */
  claimHereCents: number;
  currency: string;
  bidCount: number;
  createdAt: string;
  lastBidAt: string | null;
}

export interface LeaderboardResult {
  board: BoardKind;
  rows: LeaderboardRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  /** Lifetime total (all-time) or window spend (today/daily) of the current #1. */
  leaderSpendCents: number;
  /** Amount to pay to claim #1 on this board. */
  claimTopCents: number;
  /** For the daily board: the UTC date key being shown. */
  dateKey?: string;
}

const ALL_ORDER: Prisma.ListingOrderByWithRelationInput[] = [
  { totalCents: "desc" },
  { createdAt: "asc" },
];

async function categoryFilter(slug?: string): Promise<string | undefined> {
  if (!slug) return undefined;
  const c = await prisma.category.findUnique({ where: { slug }, select: { id: true } });
  return c?.id;
}

// ---------------------------------------------------------------------------
//  All-time board — ranked directly by Listing.totalCents
// ---------------------------------------------------------------------------

export async function getAllTimeBoard(params: {
  categorySlug?: string;
  page?: number;
  pageSize?: number;
}): Promise<LeaderboardResult> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 25));
  const settings = await getSettings();
  const rules = toBiddingRules(settings);

  const categoryId = await categoryFilter(params.categorySlug);
  const where: Prisma.ListingWhereInput = { status: "ACTIVE" };
  if (categoryId) where.categoryId = categoryId;

  const [total, listings, leader] = await Promise.all([
    prisma.listing.count({ where }),
    prisma.listing.findMany({
      where,
      orderBy: ALL_ORDER,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { category: true },
    }),
    prisma.listing.findFirst({
      where: { status: "ACTIVE" },
      orderBy: ALL_ORDER,
      select: { totalCents: true },
    }),
  ]);

  const leaderTotal = leader?.totalCents ?? 0;

  const rows: LeaderboardRow[] = listings.map((l, i) => {
    const rank = (page - 1) * pageSize + i + 1;
    return {
      rank,
      id: l.id,
      username: l.username,
      instagramUrl: l.instagramUrl,
      displayName: l.displayName,
      avatarUrl: l.avatarUrl,
      bio: l.bio,
      categoryName: l.category.name,
      categorySlug: l.category.slug,
      spendCents: l.totalCents,
      lifetimeTotalCents: l.totalCents,
      claimHereCents: claimRankTargetCents(l.totalCents, rank === 1, leaderTotal, rules),
      currency: l.currency,
      bidCount: l.bidCount,
      createdAt: l.createdAt.toISOString(),
      lastBidAt: l.lastBidAt ? l.lastBidAt.toISOString() : null,
    };
  });

  return {
    board: "all",
    rows,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    leaderSpendCents: leaderTotal,
    claimTopCents:
      leaderTotal > 0 ? leaderTotal + rules.takeTopIncrementCents : rules.startingBidCents,
  };
}

// ---------------------------------------------------------------------------
//  Window boards (Today / Daily) — ranked by SUM(Bid.amountCents) in a window
// ---------------------------------------------------------------------------

async function getWindowBoard(params: {
  board: BoardKind;
  start: Date;
  end: Date;
  categorySlug?: string;
  page?: number;
  pageSize?: number;
  dateKey?: string;
}): Promise<LeaderboardResult> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 25));
  const settings = await getSettings();
  const rules = toBiddingRules(settings);
  const categoryId = await categoryFilter(params.categorySlug);

  // Sum confirmed contributions per listing within the window.
  const grouped = await prisma.bid.groupBy({
    by: ["listingId"],
    where: {
      status: "CONFIRMED",
      confirmedAt: { gte: params.start, lt: params.end },
      listing: { status: "ACTIVE", ...(categoryId ? { categoryId } : {}) },
    },
    _sum: { amountCents: true },
    _min: { confirmedAt: true },
  });

  const ranked = grouped
    .map((g) => ({
      listingId: g.listingId,
      spendCents: g._sum.amountCents ?? 0,
      tieAt: g._min.confirmedAt?.getTime() ?? Number.MAX_SAFE_INTEGER,
    }))
    .filter((g) => g.spendCents > 0)
    .sort((a, b) => (b.spendCents !== a.spendCents ? b.spendCents - a.spendCents : a.tieAt - b.tieAt));

  const total = ranked.length;
  const leaderSpend = ranked[0]?.spendCents ?? 0;
  const pageSlice = ranked.slice((page - 1) * pageSize, page * pageSize);

  const listings = await prisma.listing.findMany({
    where: { id: { in: pageSlice.map((r) => r.listingId) } },
    include: { category: true },
  });
  const byId = new Map(listings.map((l) => [l.id, l]));

  const rows: LeaderboardRow[] = pageSlice
    .map((r, i) => {
      const l = byId.get(r.listingId);
      if (!l) return null;
      const rank = (page - 1) * pageSize + i + 1;
      return {
        rank,
        id: l.id,
        username: l.username,
        instagramUrl: l.instagramUrl,
        displayName: l.displayName,
        avatarUrl: l.avatarUrl,
        bio: l.bio,
        categoryName: l.category.name,
        categorySlug: l.category.slug,
        spendCents: r.spendCents,
        lifetimeTotalCents: l.totalCents,
        claimHereCents: claimRankTargetCents(r.spendCents, rank === 1, leaderSpend, rules),
        currency: l.currency,
        bidCount: l.bidCount,
        createdAt: l.createdAt.toISOString(),
        lastBidAt: l.lastBidAt ? l.lastBidAt.toISOString() : null,
      } satisfies LeaderboardRow;
    })
    .filter((r): r is LeaderboardRow => r !== null);

  return {
    board: params.board,
    rows,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    leaderSpendCents: leaderSpend,
    claimTopCents:
      leaderSpend > 0 ? leaderSpend + rules.takeTopIncrementCents : rules.startingBidCents,
    dateKey: params.dateKey,
  };
}

export async function getTodayBoard(params: {
  categorySlug?: string;
  page?: number;
  pageSize?: number;
}): Promise<LeaderboardResult> {
  const settings = await getSettings();
  const { start, end } = rollingWindow(settings.todayWindowHours);
  return getWindowBoard({ board: "today", start, end, ...params });
}

export async function getDailyBoard(params: {
  dateKey?: string;
  categorySlug?: string;
  page?: number;
  pageSize?: number;
}): Promise<LeaderboardResult> {
  const range = params.dateKey ? parseUtcDateKey(params.dateKey) : null;
  const { start, end } = range ?? utcDayRange();
  const key = range?.key ?? utcDayRange().start.toISOString().slice(0, 10);
  return getWindowBoard({
    board: "daily",
    start,
    end,
    categorySlug: params.categorySlug,
    page: params.page,
    pageSize: params.pageSize,
    dateKey: key,
  });
}

// ---------------------------------------------------------------------------
//  Shared board entry point + helpers
// ---------------------------------------------------------------------------

export async function getBoard(
  board: BoardKind,
  params: { categorySlug?: string; page?: number; pageSize?: number; dateKey?: string },
): Promise<LeaderboardResult> {
  if (board === "today") return getTodayBoard(params);
  if (board === "daily") return getDailyBoard(params);
  return getAllTimeBoard(params);
}

export interface TopCategory {
  name: string;
  slug: string;
  description: string;
  listingCount: number;
  topTotalCents: number | null;
  currency: string;
}

export async function getTopCategories(): Promise<TopCategory[]> {
  const settings = await getSettings();
  const categories = await prisma.category.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });

  const results = await Promise.all(
    categories.map(async (c) => {
      const [count, top] = await Promise.all([
        prisma.listing.count({ where: { categoryId: c.id, status: "ACTIVE" } }),
        prisma.listing.findFirst({
          where: { categoryId: c.id, status: "ACTIVE" },
          orderBy: ALL_ORDER,
          select: { totalCents: true },
        }),
      ]);
      return {
        name: c.name,
        slug: c.slug,
        description: c.description,
        listingCount: count,
        topTotalCents: top?.totalCents ?? null,
        currency: settings.currency,
      };
    }),
  );

  return results.sort((a, b) => {
    if (b.listingCount !== a.listingCount) return b.listingCount - a.listingCount;
    return (b.topTotalCents ?? 0) - (a.topTotalCents ?? 0);
  });
}

export async function getActiveCategoriesForForm() {
  return prisma.category.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    select: { name: true, slug: true, description: true },
  });
}
