import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminListings({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().toLowerCase();
  const status = sp.status;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const pageSize = 40;
  const settings = await getSettings();

  const where = {
    ...(q ? { username: { contains: q } } : {}),
    ...(status && status !== "all"
      ? { status: status as "PENDING" | "ACTIVE" | "DISABLED" | "REMOVED" }
      : {}),
  };

  const [total, listings] = await Promise.all([
    prisma.listing.count({ where }),
    prisma.listing.findMany({
      where,
      orderBy: [{ totalCents: "desc" }, { createdAt: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { category: true },
    }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Listings ({total})</h1>

      <form className="flex flex-wrap gap-2" action="/admin/listings">
        <input
          name="q"
          defaultValue={sp.q}
          placeholder="Search username…"
          className="h-9 rounded-lg border border-input bg-popover px-3 text-sm"
        />
        <select
          name="status"
          defaultValue={status ?? "all"}
          className="h-9 rounded-lg border border-input bg-popover px-2 text-sm"
        >
          {["all", "ACTIVE", "PENDING", "DISABLED", "REMOVED"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button className="h-9 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground">
          Filter
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-muted text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Username</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2 text-right">Lifetime</th>
              <th className="px-3 py-2 text-right">Bids</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Last bid</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {listings.map((l) => (
              <tr key={l.id} className="hover:bg-muted/40">
                <td className="px-3 py-2">
                  <Link href={`/admin/listings/${l.id}`} className="font-medium text-primary">
                    @{l.username}
                  </Link>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{l.category.name}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatMoney(l.totalCents, settings.currency)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{l.bidCount}</td>
                <td className="px-3 py-2">{l.status}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {l.lastBidAt ? timeAgo(l.lastBidAt) : "—"}
                </td>
              </tr>
            ))}
            {listings.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  No listings.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {total > pageSize && (
        <div className="flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link href={`/admin/listings?${new URLSearchParams({ ...sp, page: String(page - 1) })}`} className="text-primary">
              ← Prev
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted-foreground">
            Page {page} / {Math.ceil(total / pageSize)}
          </span>
          {page * pageSize < total ? (
            <Link href={`/admin/listings?${new URLSearchParams({ ...sp, page: String(page + 1) })}`} className="text-primary">
              Next →
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
}
