import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

type Tx = Prisma.TransactionClient;

/**
 * Recompute a listing's lifetime total from its CONFIRMED contributions.
 * Called after a refund / dispute / admin action removes a contribution.
 * Admin DISABLED / REMOVED statuses are preserved.
 */
export async function recomputeListingTotal(tx: Tx, listingId: string): Promise<void> {
  const listing = await tx.listing.findUnique({ where: { id: listingId } });
  if (!listing) return;

  const agg = await tx.bid.aggregate({
    where: { listingId, status: "CONFIRMED" },
    _sum: { amountCents: true },
    _count: true,
    _max: { confirmedAt: true },
  });

  const total = agg._sum.amountCents ?? 0;
  const count = agg._count;
  const keepAdminStatus = listing.status === "DISABLED" || listing.status === "REMOVED";

  await tx.listing.update({
    where: { id: listingId },
    data: {
      totalCents: total,
      bidCount: count,
      lastBidAt: agg._max.confirmedAt ?? null,
      status: keepAdminStatus ? listing.status : count > 0 ? "ACTIVE" : "PENDING",
    },
  });
}

export interface RankInfo {
  globalRank: number | null;
  categoryRank: number | null;
}

/**
 * 1-based all-time rank of a listing among ACTIVE listings, globally and within
 * its category. Ordering: totalCents desc, then earliest createdAt (older wins).
 */
export async function getListingRank(listingId: string): Promise<RankInfo> {
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.status !== "ACTIVE") {
    return { globalRank: null, categoryRank: null };
  }

  const higher = (scope: Prisma.ListingWhereInput) =>
    prisma.listing.count({
      where: {
        status: "ACTIVE",
        ...scope,
        OR: [
          { totalCents: { gt: listing.totalCents } },
          { totalCents: listing.totalCents, createdAt: { lt: listing.createdAt } },
        ],
      },
    });

  const [globalHigher, categoryHigher] = await Promise.all([
    higher({}),
    higher({ categoryId: listing.categoryId }),
  ]);

  return { globalRank: globalHigher + 1, categoryRank: categoryHigher + 1 };
}
