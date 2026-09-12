import { getAnalyticsSummary, getBlockedBidAttemptsSummary, type CountryVisitDetail } from "@/lib/analytics";
import { timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

/** "US" -> 🇺🇸 via regional indicator symbols — no flag asset/library needed. */
function flagEmoji(code: string): string {
  if (!/^[A-Z]{2}$/i.test(code)) return "🌐";
  return code
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
    .join("");
}

export default async function AdminAnalytics() {
  const [summary, blockedAttempts] = await Promise.all([
    getAnalyticsSummary(),
    getBlockedBidAttemptsSummary(),
  ]);
  const maxHourly = Math.max(1, ...summary.hourly.map((h) => h.count));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Analytics</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Built in — pageviews from our own beacon, no third-party script. &ldquo;Pageviews&rdquo;
          counts every hit; &ldquo;Unique visitors&rdquo; dedupes by a daily-rotating, non-reversible
          fingerprint (IP + browser + day, hashed — never stored raw, never a cookie, resets every
          UTC day).
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card label="Pageviews · 24h" value={summary.pageviews24h} />
        <Card label="Pageviews · 7d" value={summary.pageviews7d} />
        <Card label="Unique visitors · 24h" value={summary.uniqueVisitors24h} />
        <Card label="Unique visitors · 7d" value={summary.uniqueVisitors7d} />
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">Last 24 hours</h2>
        <div className="flex h-32 items-end gap-1">
          {summary.hourly.map((h) => (
            <div key={h.hour} className="group relative flex-1">
              <div
                className="w-full rounded-t bg-primary/70 transition-colors group-hover:bg-primary"
                style={{ height: `${Math.max(2, (h.count / maxHourly) * 100)}%` }}
              />
              <span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 rounded bg-foreground px-1.5 py-0.5 text-[10px] text-background group-hover:block">
                {h.count}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
          <span>24h ago</span>
          <span>now</span>
        </div>
      </div>

      <BlockedBidAttempts summary={blockedAttempts} />

      <VisitorHeatMap details={summary.countryVisitDetails} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Table title="Top pages (7d)" rows={summary.topPages.map((p) => [p.path, p.count])} />
        <Table
          title="Top referrers (7d)"
          rows={summary.topReferrers.map((r) => [r.referrer, r.count])}
        />
        <Table title="Browsers (7d)" rows={summary.browsers.map((b) => [b.browser, b.count])} />
        <Table
          title="Pageviews by country (7d)"
          rows={summary.countries.map((c) => [c.country, c.count])}
          emptyHint="Populated once traffic reaches the live domain (Vercel sends the visitor's country)."
        />
      </div>
    </div>
  );
}

/**
 * A country-intensity "heat map" — no world-map SVG (hand-drawn geography is
 * a maintenance trap and would need a third-party atlas, which cuts against
 * the "no third-party script" rule this whole analytics setup is built on).
 * Tile background opacity scales with that country's share of unique
 * visitors, and each tile lists what those visitors were actually looking
 * at, so "heat" and "areas visited" are both answered in one place.
 */
function VisitorHeatMap({ details }: { details: CountryVisitDetail[] }) {
  const max = Math.max(1, ...details.map((d) => d.uniqueVisitors));

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h2 className="text-sm font-semibold">Visitor heat map (7d)</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Unique visitors by country — tile intensity is that country&apos;s share of the total. Each
        tile lists what pages those visitors actually viewed.
      </p>
      {details.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Populated once traffic reaches the live domain.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {details.map((d) => {
            const intensity = d.uniqueVisitors / max;
            return (
              <div
                key={d.country}
                className="rounded-lg border border-border p-3"
                style={{ backgroundColor: `color-mix(in srgb, var(--primary) ${Math.round(intensity * 45)}%, var(--card))` }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-sm font-semibold">
                    <span className="text-base">{flagEmoji(d.country)}</span>
                    {d.country}
                  </span>
                  <span className="text-sm font-semibold tabular-nums">{d.uniqueVisitors}</span>
                </div>
                <ul className="mt-2 space-y-0.5">
                  {d.topPaths.length === 0 ? (
                    <li className="text-xs text-muted-foreground">No page data</li>
                  ) : (
                    d.topPaths.map((p) => (
                      <li
                        key={p.path}
                        className="flex items-center justify-between gap-2 text-xs text-muted-foreground"
                      >
                        <span className="min-w-0 truncate">{p.path}</span>
                        <span className="shrink-0 tabular-nums">{p.count}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const BLOCKED_REASON_LABEL: Record<string, string> = {
  BIDDING_DISABLED: "Bidding paused",
  LISTINGS_DISABLED: "New listings paused",
};

/**
 * Real demand that never got the chance to become a Bid row: someone filled
 * the claim form and hit submit while biddingEnabled/listingsEnabled was
 * false. createBidIntent rejects before writing anything in that case, so
 * without this table that attempt would leave zero trace in the database —
 * this is the only place that answers "did anyone actually try."
 */
function BlockedBidAttempts({
  summary,
}: {
  summary: { count24h: number; count7d: number; recent: { username: string | null; reason: string; createdAt: string }[] };
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h2 className="text-sm font-semibold">Blocked bid attempts</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Real submissions rejected because bidding or new listings were paused — the only record of
        demand that never became a Bid row.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:w-64">
        <Card label="Blocked · 24h" value={summary.count24h} />
        <Card label="Blocked · 7d" value={summary.count7d} />
      </div>
      {summary.recent.length > 0 && (
        <ul className="mt-4 divide-y divide-border text-sm">
          {summary.recent.map((a, i) => (
            <li key={i} className="flex items-center justify-between gap-2 py-1.5">
              <span className="min-w-0 truncate">
                {a.username ? `@${a.username}` : <span className="text-muted-foreground">no handle entered</span>}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {BLOCKED_REASON_LABEL[a.reason] ?? a.reason} · {timeAgo(a.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value.toLocaleString()}</p>
    </div>
  );
}

function Table({
  title,
  rows,
  emptyHint,
}: {
  title: string;
  rows: [string, number][];
  emptyHint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyHint ?? "No data yet."}</p>
      ) : (
        <ul className="divide-y divide-border text-sm">
          {rows.map(([label, count]) => (
            <li key={label} className="flex items-center justify-between gap-2 py-1.5">
              <span className="min-w-0 truncate">{label}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">{count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
