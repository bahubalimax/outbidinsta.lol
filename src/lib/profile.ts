import "server-only";
import { prisma } from "@/lib/db";
import { getSettings, toBiddingRules } from "@/lib/settings";
import { minTargetTotalCents } from "@/lib/bidding";
import { getListingRank } from "@/lib/listings";
import { tryNormalizeInstagram } from "@/lib/instagram";
import { rollingWindow, utcDayRange } from "@/lib/date-windows";

export interface ProfileView {
  listingId: string;
  username: string;
  instagramUrl: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  category: { name: string; slug: string };
  status: string;
  biddable: boolean;
  currency: string;
  lifetimeTotalCents: number;
  todaySpendCents: number;
  dailySpendCents: number;
  minNextTargetCents: number;
  minIncrementCents: number;
  bidCount: number;
  createdAt: string;
  lastBidAt: string | null;
  globalRank: number | null;
  categoryRank: number | null;
  history: {
    id: string;
    amountCents: number;
    targetTotalCents: number;
    currency: string;
    confirmedAt: string | null;
    createdAt: string;
  }[];
}

export async function getProfileView(rawUsername: string): Promise<ProfileView | null> {
  const normalized = tryNormalizeInstagram(rawUsername);
  const username = normalized?.username ?? rawUsername.toLowerCase();

  const listing = await prisma.listing.findUnique({
    where: { username },
    include: {
      category: true,
      bids: {
        where: { status: "CONFIRMED" },
        orderBy: { confirmedAt: "desc" },
        take: 20,
      },
    },
  });
  if (!listing) return null;

  const settings = await getSettings();
  const rules = toBiddingRules(settings);
  const rank = await getListingRank(listing.id);
  const biddable = listing.status === "PENDING" || listing.status === "ACTIVE";

  const today = rollingWindow(settings.todayWindowHours);
  const day = utcDayRange();
  const [todayAgg, dailyAgg] = await Promise.all([
    prisma.bid.aggregate({
      where: {
        listingId: listing.id,
        status: "CONFIRMED",
        confirmedAt: { gte: today.start, lt: today.end },
      },
      _sum: { amountCents: true },
    }),
    prisma.bid.aggregate({
      where: {
        listingId: listing.id,
        status: "CONFIRMED",
        confirmedAt: { gte: day.start, lt: day.end },
      },
      _sum: { amountCents: true },
    }),
  ]);

  return {
    listingId: listing.id,
    username: listing.username,
    instagramUrl: listing.instagramUrl,
    displayName: listing.displayName,
    avatarUrl: listing.avatarUrl,
    bio: listing.bio,
    category: { name: listing.category.name, slug: listing.category.slug },
    status: listing.status,
    biddable,
    currency: listing.currency,
    lifetimeTotalCents: listing.totalCents,
    todaySpendCents: todayAgg._sum.amountCents ?? 0,
    dailySpendCents: dailyAgg._sum.amountCents ?? 0,
    minNextTargetCents: minTargetTotalCents({ totalCents: listing.totalCents, biddable }, rules),
    minIncrementCents: settings.minIncrementCents,
    bidCount: listing.bidCount,
    createdAt: listing.createdAt.toISOString(),
    lastBidAt: listing.lastBidAt ? listing.lastBidAt.toISOString() : null,
    globalRank: rank.globalRank,
    categoryRank: rank.categoryRank,
    history: listing.bids.map((b) => ({
      id: b.id,
      amountCents: b.amountCents,
      targetTotalCents: b.targetTotalCents,
      currency: b.currency,
      confirmedAt: b.confirmedAt ? b.confirmedAt.toISOString() : null,
      createdAt: b.createdAt.toISOString(),
    })),
  };
}
