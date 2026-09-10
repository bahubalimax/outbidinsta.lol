import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getListingRank } from "@/lib/listings";
import { formatMoney } from "@/lib/money";
import { timeAgo } from "@/lib/format";
import { ActionButton } from "@/components/admin/action-button";
import { ChangeCategoryForm } from "@/components/admin/change-category";

export const dynamic = "force-dynamic";

export default async function AdminListingDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [listing, settings, categories] = await Promise.all([
    prisma.listing.findUnique({
      where: { id },
      include: {
        category: true,
        bids: { orderBy: { createdAt: "desc" }, include: { bidder: true } },
        payments: { orderBy: { createdAt: "desc" } },
      },
    }),
    getSettings(),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  if (!listing) notFound();
  const rank = await getListingRank(listing.id);
  const base = `/api/admin/listings/${listing.id}`;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/listings" className="text-sm text-muted-foreground">
          ← Listings
        </Link>
        <h1 className="mt-1 text-xl font-semibold">
          @{listing.username}{" "}
          <a
            href={listing.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-normal text-primary"
          >
            open ↗
          </a>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {listing.status} · {listing.category.name} · lifetime{" "}
          {formatMoney(listing.totalCents, settings.currency)} · {listing.bidCount} bids
          {rank.globalRank ? ` · #${rank.globalRank} overall` : ""}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <ActionButton url={base} body={{ action: "enable" }} label="Enable / reinstate" tone="primary" />
        <ActionButton url={base} body={{ action: "disable" }} label="Disable" />
        <ActionButton
          url={base}
          body={{ action: "remove" }}
          label="Remove (fraud)"
          tone="danger"
          confirm="Remove this listing from all boards?"
        />
        <ActionButton url={base} body={{ action: "recalc" }} label="Recalculate total" />
      </div>

      <div className="text-sm">
        <span className="block text-xs text-muted-foreground">Move to category</span>
        <div className="mt-1">
          <ChangeCategoryForm
            listingId={listing.id}
            categories={categories.map((c) => ({ id: c.id, name: c.name }))}
            current={listing.categoryId}
          />
        </div>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold">Bids ({listing.bids.length})</h2>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Bidder</th>
                <th className="px-3 py-2 text-right">Charged</th>
                <th className="px-3 py-2 text-right">Target total</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Confirmed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {listing.bids.map((b) => (
                <tr key={b.id}>
                  <td className="px-3 py-2 text-xs">{b.bidder.email}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    +{formatMoney(b.amountCents, b.currency)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatMoney(b.targetTotalCents, b.currency)}
                  </td>
                  <td className="px-3 py-2">{b.status}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {b.confirmedAt ? timeAgo(b.confirmedAt) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold">Payments ({listing.payments.length})</h2>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Provider id</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {listing.payments.map((p) => (
                <tr key={p.id}>
                  <td className="px-3 py-2 font-mono text-[11px]">
                    {p.providerPaymentId ?? p.providerCheckoutId ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatMoney(p.amountCents, p.currency)}
                  </td>
                  <td className="px-3 py-2">{p.status}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{timeAgo(p.createdAt)}</td>
                  <td className="px-3 py-2">
                    {p.status === "paid" && p.providerPaymentId && (
                      <ActionButton
                        url={`/api/admin/payments/${p.id}/refund`}
                        body={{ reason: "Admin refund" }}
                        label="Refund"
                        tone="danger"
                        confirm="Refund this payment via the provider?"
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
