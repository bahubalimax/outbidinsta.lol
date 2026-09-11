import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import {
  getHeaderStats,
  getPublicCountryBreakdown,
  getPublicBrowserBreakdown,
  type LabeledStat,
} from "@/lib/analytics";
import { formatMoney } from "@/lib/money";
import { SITE_NAME } from "@/lib/site";

/** "US" -> 🇺🇸 via regional indicator symbols — no flag asset/library needed. */
function flagEmoji(code: string): string {
  if (!/^[A-Z]{2}$/i.test(code)) return "🌐";
  return code
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
    .join("");
}

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Live stats",
  description: `Real, public numbers for ${SITE_NAME} — visitors, revenue, and profiles ranked.`,
  alternates: { canonical: "/stats" },
};

export default async function StatsPage() {
  const [settings, headerStats, revenueAgg, activeListings, totalListings, countries, browsers] =
    await Promise.all([
      getSettings(),
      getHeaderStats(),
      prisma.payment.aggregate({ _sum: { amountCents: true }, where: { status: "paid" } }),
      prisma.listing.count({ where: { status: "ACTIVE" } }),
      prisma.listing.count(),
      getPublicCountryBreakdown(),
      getPublicBrowserBreakdown(),
    ]);

  const revenue = formatMoney(revenueAgg._sum.amountCents ?? 0, settings.currency);
  const maxCountryCount = Math.max(1, ...countries.map((c) => c.count));

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

      {countries.length > 0 && (
        <div className="mt-8 rounded-2xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Visitors by country</h2>
          <div className="mt-4 flex flex-col gap-2.5">
            {countries.map((c) => (
              <div key={c.code} className="flex items-center gap-3">
                <span className="w-8 shrink-0 text-base">{flagEmoji(c.code)}</span>
                <span className="w-10 shrink-0 text-xs font-medium text-muted-foreground">
                  {c.code}
                </span>
                <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="brand-gradient-bg h-full rounded-full"
                    style={{ width: `${Math.max(4, (c.count / maxCountryCount) * 100)}%` }}
                  />
                </div>
                <span className="w-12 shrink-0 text-right text-xs font-semibold tabular-nums">
                  {c.count.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {browsers.length > 0 && <BarSection title="Visitors by browser" rows={browsers} />}

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

function BarSection({ title, rows }: { title: string; rows: LabeledStat[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="mt-4 flex flex-col gap-2.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-3">
            <span
              title={r.label}
              className="w-28 shrink-0 truncate text-xs font-medium text-muted-foreground"
            >
              {r.label}
            </span>
            <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="brand-gradient-bg h-full rounded-full"
                style={{ width: `${Math.max(4, (r.count / max) * 100)}%` }}
              />
            </div>
            <span className="w-12 shrink-0 text-right text-xs font-semibold tabular-nums">
              {r.count.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
