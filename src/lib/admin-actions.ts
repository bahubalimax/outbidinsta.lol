import "server-only";
import { revalidateTag } from "next/cache";
import { prisma, runSerializable } from "@/lib/db";
import { recomputeListingTotal } from "@/lib/listings";
import { invalidateSettingsCache, updateSettings, type AppSettings } from "@/lib/settings";
import { isSupportedCurrency } from "@/lib/money";
import { refundPayment } from "@/lib/dodo";
import { log } from "@/lib/logger";
import type { z } from "zod";
import type { categoryInputSchema, categoryUpdateSchema } from "@/lib/validation";

// ---- Categories ---------------------------------------------------------

export async function createCategory(input: z.infer<typeof categoryInputSchema>) {
  const category = await prisma.category.create({ data: input });
  revalidateTag("categories");
  return category;
}

export async function updateCategory(id: string, input: z.infer<typeof categoryUpdateSchema>) {
  const category = await prisma.category.update({ where: { id }, data: input });
  revalidateTag("categories");
  revalidateTag("board");
  return category;
}

export async function deleteCategory(id: string): Promise<{ deleted: boolean; reason?: string }> {
  const count = await prisma.listing.count({ where: { categoryId: id } });
  if (count > 0) {
    return { deleted: false, reason: `Category has ${count} listing(s). Disable it instead.` };
  }
  await prisma.category.delete({ where: { id } });
  revalidateTag("categories");
  return { deleted: true };
}

export async function reorderCategories(order: string[]): Promise<void> {
  await prisma.$transaction(
    order.map((id, index) => prisma.category.update({ where: { id }, data: { sortOrder: index } })),
  );
  revalidateTag("categories");
}

// ---- Settings ---------------------------------------------------------

export async function saveSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  if (patch.currency && !isSupportedCurrency(patch.currency)) {
    throw new Error(`Unsupported currency: ${patch.currency}`);
  }
  const next = await updateSettings(patch);
  invalidateSettingsCache();
  revalidateTag("board");
  log.info("admin.settings.updated", { ...patch });
  return next;
}

// ---- Listings -------------------------------------------------------

export type ListingAction = "enable" | "disable" | "remove" | "reinstate" | "recalc";

export async function applyListingAction(id: string, action: ListingAction): Promise<void> {
  await runSerializable(async (tx) => {
    const listing = await tx.listing.findUnique({ where: { id } });
    if (!listing) throw new Error("Listing not found");

    switch (action) {
      case "disable":
        await tx.listing.update({ where: { id }, data: { status: "DISABLED" } });
        break;
      case "remove":
        await tx.listing.update({ where: { id }, data: { status: "REMOVED" } });
        break;
      case "enable":
      case "reinstate":
        await tx.listing.update({ where: { id }, data: { status: "ACTIVE" } });
        await recomputeListingTotal(tx, id);
        break;
      case "recalc":
        await recomputeListingTotal(tx, id);
        break;
    }
  });
  revalidateTag("board");
  log.info("admin.listing.action", { id, action });
}

export async function changeListingCategory(id: string, categoryId: string): Promise<void> {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) throw new Error("Category not found");
  await prisma.listing.update({ where: { id }, data: { categoryId } });
  revalidateTag("board");
  log.info("admin.listing.category_changed", { id, categoryId });
}

// ---- Payments ----------------------------------------------------

export async function adminRefundPayment(
  paymentId: string,
  reason: string,
): Promise<{ ok: boolean; reason?: string }> {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) return { ok: false, reason: "Payment not found" };
  if (!payment.providerPaymentId) return { ok: false, reason: "Payment has no provider id yet" };
  if (payment.status === "refunded") return { ok: true };

  await refundPayment(payment.providerPaymentId, reason || "Admin refund");
  await prisma.payment.update({
    where: { id: paymentId },
    data: { status: "refunded", failureReason: `admin_refund: ${reason}`.slice(0, 200) },
  });
  log.info("admin.payment.refunded", { paymentId, reason });
  return { ok: true };
}

// ---- Dashboard stats -----------------------------------------

export async function getAdminStats() {
  const [
    revenueAgg,
    totalBids,
    confirmedBids,
    totalListings,
    activeListings,
    paidPayments,
    failedPayments,
    refundedPayments,
    disputedPayments,
    pendingPayments,
  ] = await Promise.all([
    prisma.payment.aggregate({ _sum: { amountCents: true }, where: { status: "paid" } }),
    prisma.bid.count(),
    prisma.bid.count({ where: { status: "CONFIRMED" } }),
    prisma.listing.count(),
    prisma.listing.count({ where: { status: "ACTIVE" } }),
    prisma.payment.count({ where: { status: "paid" } }),
    prisma.payment.count({ where: { status: "failed" } }),
    prisma.payment.count({ where: { status: "refunded" } }),
    prisma.payment.count({ where: { status: "disputed" } }),
    prisma.payment.count({ where: { status: "pending" } }),
  ]);

  return {
    revenueCents: revenueAgg._sum.amountCents ?? 0,
    totalBids,
    confirmedBids,
    totalListings,
    activeListings,
    paidPayments,
    failedPayments,
    refundedPayments,
    disputedPayments,
    pendingPayments,
  };
}
