import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { timeAgo } from "@/lib/format";
import { ActionButton } from "@/components/admin/action-button";

export const dynamic = "force-dynamic";

const STATUSES = ["all", "pending", "paid", "failed", "cancelled", "refunded", "disputed"];

export default async function AdminPayments({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const status = sp.status && STATUSES.includes(sp.status) ? sp.status : "all";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const pageSize = 50;

  const where = status === "all" ? {} : { status: status as never };
  const [total, payments] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { listing: { select: { username: true } }, user: { select: { email: true } } },
    }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Payments ({total})</h1>
      <div className="flex flex-wrap gap-1.5">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/payments${s === "all" ? "" : `?status=${s}`}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              status === s ? "border-primary bg-primary text-primary-foreground" : "border-border"
            }`}
          >
            {s}
          </Link>
        ))}
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="bg-muted text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Provider id</th>
              <th className="px-3 py-2">Listing</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2 text-right">Amount</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {payments.map((p) => (
              <tr key={p.id}>
                <td className="px-3 py-2 font-mono text-[11px]">
                  {p.providerPaymentId ?? p.providerCheckoutId ?? "—"}
                </td>
                <td className="px-3 py-2">
                  <Link href={`/profile/${p.listing.username}`} className="text-primary">
                    @{p.listing.username}
                  </Link>
                </td>
                <td className="px-3 py-2 text-xs">{p.user?.email ?? "—"}</td>
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
                      confirm="Refund via the provider?"
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
