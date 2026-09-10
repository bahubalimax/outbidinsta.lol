import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminUsers({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const pageSize = 50;

  const [total, users] = await Promise.all([
    prisma.user.count(),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: { select: { bids: true, payments: true } },
        payments: { where: { status: "paid" }, select: { amountCents: true, currency: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Users ({total})</h1>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-muted text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2 text-right">Bids</th>
              <th className="px-3 py-2 text-right">Payments</th>
              <th className="px-3 py-2 text-right">Paid total</th>
              <th className="px-3 py-2">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => {
              const paid = u.payments.reduce((s, p) => s + p.amountCents, 0);
              return (
                <tr key={u.id}>
                  <td className="px-3 py-2">{u.email}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{u._count.bids}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{u._count.payments}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatMoney(paid, u.payments[0]?.currency ?? "USD")}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{timeAgo(u.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
