import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUSES = ["all", "PENDING", "CONFIRMED", "FAILED", "CANCELLED", "REFUNDED", "DISPUTED", "VOID"];

export default async function AdminBids({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const status = sp.status && STATUSES.includes(sp.status) ? sp.status : "all";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const pageSize = 50;

  const where = status === "all" ? {} : { status: status as never };
  const [total, bids] = await Promise.all([
    prisma.bid.count({ where }),
    prisma.bid.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { listing: { select: { username: true } }, bidder: { select: { email: true } } },
    }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Bids ({total})</h1>
      <div className="flex flex-wrap gap-1.5">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/bids${s === "all" ? "" : `?status=${s}`}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              status === s ? "border-primary bg-primary text-primary-foreground" : "border-border"
            }`}
          >
            {s}
          </Link>
        ))}
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Listing</th>
              <th className="px-3 py-2">Bidder</th>
              <th className="px-3 py-2 text-right">Charged</th>
              <th className="px-3 py-2 text-right">Target</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {bids.map((b) => (
              <tr key={b.id}>
                <td className="px-3 py-2">
                  <Link href={`/profile/${b.listing.username}`} className="text-primary">
                    @{b.listing.username}
                  </Link>
                </td>
                <td className="px-3 py-2 text-xs">{b.bidder.email}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  +{formatMoney(b.amountCents, b.currency)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatMoney(b.targetTotalCents, b.currency)}
                </td>
                <td className="px-3 py-2">{b.status}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{timeAgo(b.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager total={total} pageSize={pageSize} page={page} base={`/admin/bids?status=${status}&`} />
    </div>
  );
}

function Pager({ total, pageSize, page, base }: { total: number; pageSize: number; page: number; base: string }) {
  if (total <= pageSize) return null;
  const pages = Math.ceil(total / pageSize);
  return (
    <div className="flex items-center justify-between text-sm">
      {page > 1 ? (
        <Link href={`${base}page=${page - 1}`} className="text-primary">
          ← Prev
        </Link>
      ) : (
        <span />
      )}
      <span className="text-muted-foreground">
        Page {page} / {pages}
      </span>
      {page < pages ? (
        <Link href={`${base}page=${page + 1}`} className="text-primary">
          Next →
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}
