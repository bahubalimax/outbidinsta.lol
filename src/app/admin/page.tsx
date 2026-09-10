import Link from "next/link";
import { getAdminStats } from "@/lib/admin-actions";
import { getSettings } from "@/lib/settings";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [stats, settings, recentBids, unprocessed] = await Promise.all([
    getAdminStats(),
    getSettings(true),
    prisma.bid.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { listing: { select: { username: true } } },
    }),
    prisma.webhookEvent.count({ where: { processed: false } }),
  ]);

  const cards: { label: string; value: string; href?: string }[] = [
    { label: "Confirmed revenue", value: formatMoney(stats.revenueCents, settings.currency) },
    { label: "Confirmed bids", value: `${stats.confirmedBids} / ${stats.totalBids}`, href: "/admin/bids" },
    { label: "Active listings", value: `${stats.activeListings} / ${stats.totalListings}`, href: "/admin/listings" },
    { label: "Successful payments", value: String(stats.paidPayments), href: "/admin/payments" },
    { label: "Failed payments", value: String(stats.failedPayments), href: "/admin/payments" },
    { label: "Refunds", value: String(stats.refundedPayments), href: "/admin/payments" },
    { label: "Disputes", value: String(stats.disputedPayments), href: "/admin/payments" },
    { label: "Pending payments", value: String(stats.pendingPayments), href: "/admin/payments" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      {unprocessed > 0 && (
        <Link
          href="/admin/webhooks"
          className="block rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning"
        >
          {unprocessed} unprocessed webhook event{unprocessed === 1 ? "" : "s"} — review →
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href ?? "/admin"}
            className="rounded-xl border border-border bg-card p-4"
          >
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{c.value}</p>
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Rules</h2>
          <Link href="/admin/settings" className="text-xs font-medium text-primary">
            Edit →
          </Link>
        </div>
        <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          <Row k="Start" v={formatMoney(settings.startingBidCents, settings.currency)} />
          <Row k="Increment" v={formatMoney(settings.minIncrementCents, settings.currency)} />
          <Row k="Take #1" v={`+${formatMoney(settings.takeTopIncrementCents, settings.currency)}`} />
          <Row k="Max" v={formatMoney(settings.maxBidCents, settings.currency)} />
          <Row k="Today window" v={`${settings.todayWindowHours}h`} />
          <Row k="Bidding" v={settings.biddingEnabled ? "on" : "paused"} />
        </dl>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">Recent bids</h2>
        <ul className="divide-y divide-border text-sm">
          {recentBids.map((b) => (
            <li key={b.id} className="flex items-center justify-between py-2">
              <span className="truncate">
                <Link href={`/admin/listings`} className="font-medium">
                  @{b.listing.username}
                </Link>{" "}
                <span className="text-muted-foreground">
                  +{formatMoney(b.amountCents, b.currency)} → {formatMoney(b.targetTotalCents, b.currency)}
                </span>
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {b.status} · {timeAgo(b.createdAt)}
              </span>
            </li>
          ))}
          {recentBids.length === 0 && <li className="py-2 text-muted-foreground">No bids yet.</li>}
        </ul>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{k}</dt>
      <dd className="font-medium tabular-nums">{v}</dd>
    </div>
  );
}
