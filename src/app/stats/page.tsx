import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getHeaderStats } from "@/lib/analytics";
import { formatMoney } from "@/lib/money";
import { SITE_NAME } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Live stats",
  description: `Real, public numbers for ${SITE_NAME} — visitors, revenue, and profiles ranked.`,
  alternates: { canonical: "/stats" },
};

export default async function StatsPage() {
  const [settings, headerStats, revenueAgg, activeListings, totalListings] = await Promise.all([
    getSettings(),
    getHeaderStats(),
    prisma.payment.aggregate({ _sum: { amountCents: true }, where: { status: "paid" } }),
    prisma.listing.count({ where: { status: "ACTIVE" } }),
    prisma.listing.count(),
  ]);

  const revenue = formatMoney(revenueAgg._sum.amountCents ?? 0, settings.currency);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-6 pb-16">
      <h1 className="text-2xl font-semibold tracking-tight">Live stats</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Real numbers, updated live — no fabricated counts. {SITE_NAME} tracks pageviews with its
        own beacon (see the footer), nothing third-party.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat value={String(headerStats.activeNow)} label="online now" />
        <Stat value={headerStats.visitorsToday.toLocaleString()} label="visitors today" />
        <Stat value={headerStats.visitorsAllTime.toLocaleString()} label="visitors all-time" />
        <Stat value={revenue} label="confirmed bids value" />
        <Stat value={String(activeListings)} label="profiles ranked" />
        <Stat value={String(totalListings)} label="profiles claimed (ever)" />
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        &ldquo;Online now&rdquo; and &ldquo;visitors&rdquo; are real pageview counts, not deduped
        unique-visitor sessions — we don&apos;t use cookies or cross-site tracking.
      </p>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 text-center">
      <p className="font-mono text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
