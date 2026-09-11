import "server-only";
import type { Prisma, ActivityType } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";

type Tx = Prisma.TransactionClient;

/**
 * Public activity feed. Entries reference only the (already public) Instagram
 * handle, category, rank and amounts — never the bidder's email, payment id or
 * any other personal / payment data.
 */
export async function recordActivity(
  tx: Tx,
  input: {
    type: ActivityType;
    listingId: string;
    username: string;
    categorySlug?: string | null;
    rank?: number | null;
    amountCents?: number | null;
    totalCents?: number | null;
    currency?: string;
  },
): Promise<void> {
  await tx.activityEvent.create({
    data: {
      type: input.type,
      listingId: input.listingId,
      username: input.username,
      categorySlug: input.categorySlug ?? null,
      rank: input.rank ?? null,
      amountCents: input.amountCents ?? null,
      totalCents: input.totalCents ?? null,
      currency: input.currency ?? "USD",
    },
  });
}

export interface RecentActivityItem {
  id: string;
  type: ActivityType;
  listingId: string;
  username: string;
  categorySlug: string | null;
  rank: number | null;
  amountCents: number | null;
  totalCents: number | null;
  currency: string;
  /** ISO string, not a Date — this return value round-trips through Next's
   * data cache (JSON), which would otherwise silently turn Date objects into
   * plain strings and break any caller doing `.createdAt.toISOString()`. */
  createdAt: string;
}

async function getRecentActivityUncached(limit: number): Promise<RecentActivityItem[]> {
  const rows = await prisma.activityEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 100),
  });
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    listingId: r.listingId,
    username: r.username,
    categorySlug: r.categorySlug,
    rank: r.rank,
    amountCents: r.amountCents,
    totalCents: r.totalCents,
    currency: r.currency,
    createdAt: r.createdAt.toISOString(),
  }));
}

const cachedRecentActivity = unstable_cache(getRecentActivityUncached, ["recent-activity"], {
  revalidate: 5,
  tags: ["board"],
});

export function getRecentActivity(limit = 25): Promise<RecentActivityItem[]> {
  return cachedRecentActivity(limit);
}
