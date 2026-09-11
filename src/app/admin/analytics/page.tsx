import { getAnalyticsSummary } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export default async function AdminAnalytics() {
  const summary = await getAnalyticsSummary();
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        <Table
          title="Unique visitors by country (7d)"
          rows={summary.uniqueVisitorCountries.map((c) => [c.country, c.count])}
          emptyHint="Populated once traffic reaches the live domain."
        />
      </div>
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
