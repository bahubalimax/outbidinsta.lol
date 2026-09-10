import "server-only";
import type { Prisma, ActivityType } from "@prisma/client";
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

export async function getRecentActivity(limit = 25) {
  return prisma.activityEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 100),
  });
}
