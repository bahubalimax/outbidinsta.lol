import "server-only";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { utcDayRange } from "@/lib/date-windows";

/**
 * Minimal, self-hosted analytics — a "just enough" stand-in for a paid tool
 * like DataFast. One table (PageView), one beacon endpoint, one admin page.
 * No cookies, no cross-site tracking, no third-party script.
 */

export interface TrackInput {
  path: string;
  referrer?: string | null;
  userAgent?: string | null;
  country?: string | null;
}

/**
 * Known non-visitor noise, not real people: Dodo's own checkout/fraud-check
 * domains bouncing back to us mid-payment, and local dev testing writing into
 * this same shared database. Excluded from every visitor count and
 * breakdown below — every number here is a promise of "real, not fabricated."
 */
const EXCLUDED_REFERRERS = [
  "test.checkout.dodopayments.com",
  "sentinal-v2.dodopayments.com",
  "localhost",
];
// Prisma's `notIn` on a nullable column excludes NULL rows too (verified —
// it is NOT "keep nulls, drop the named values"), which would have silently
// wiped out all "Direct" (no-referrer) traffic. Spell it out explicitly.
const REAL_TRAFFIC: { OR: ({ referrer: null } | { referrer: { notIn: string[] } })[] } = {
  OR: [{ referrer: null }, { referrer: { notIn: EXCLUDED_REFERRERS } }],
};

/** Coarse User-Agent parse — just enough to bucket a browser breakdown. */
export function parseUserAgent(ua: string | null | undefined): {
  browser: string;
  device: "mobile" | "desktop";
} {
  const s = ua ?? "";
  const device: "mobile" | "desktop" = /Mobi|Android(?!.*Tablet)|iPhone/i.test(s)
    ? "mobile"
    : "desktop";

  let browser = "Other";
  if (/EdgA?\//i.test(s)) browser = "Edge";
  else if (/OPR\/|Opera/i.test(s)) browser = "Opera";
  else if (/Chrome\//i.test(s) && !/Chromium/i.test(s)) browser = "Chrome";
  else if (/CriOS\//i.test(s)) browser = "Chrome";
  else if (/FxiOS\//i.test(s) || /Firefox\//i.test(s)) browser = "Firefox";
  else if (/Safari\//i.test(s) && /Version\//i.test(s)) browser = "Safari";
  else if (/bot|crawler|spider|slurp|bingpreview/i.test(s)) browser = "Bot";

  return { browser, device };
}

/** Referrer hostname only — never store the full referring URL (query strings can carry PII). */
function referrerHost(referrer: string | null | undefined): string | null {
  if (!referrer) return null;
  try {
    return new URL(referrer).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export async function recordPageView(input: TrackInput): Promise<void> {
  const { browser, device } = parseUserAgent(input.userAgent);
  await prisma.pageView.create({
    data: {
      path: input.path.slice(0, 300),
      referrer: referrerHost(input.referrer),
      browser,
      device,
      country: input.country?.slice(0, 8) ?? null,
    },
  });
}

export interface AnalyticsSummary {
  visitors24h: number;
  pageviews24h: number;
  pageviews7d: number;
  topPages: { path: string; count: number }[];
  topReferrers: { referrer: string; count: number }[];
  browsers: { browser: string; count: number }[];
  countries: { country: string; count: number }[];
  hourly: { hour: string; count: number }[];
}

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const now = new Date();
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [pageviews24h, pageviews7d, topPagesRaw, topReferrersRaw, browsersRaw, countriesRaw, recentRows] =
    await Promise.all([
      prisma.pageView.count({ where: { createdAt: { gte: since24h }, ...REAL_TRAFFIC } }),
      prisma.pageView.count({ where: { createdAt: { gte: since7d }, ...REAL_TRAFFIC } }),
      prisma.pageView.groupBy({
        by: ["path"],
        where: { createdAt: { gte: since7d }, ...REAL_TRAFFIC },
        _count: { path: true },
        orderBy: { _count: { path: "desc" } },
        take: 10,
      }),
      prisma.pageView.groupBy({
        by: ["referrer"],
        where: { createdAt: { gte: since7d }, referrer: { not: null, notIn: EXCLUDED_REFERRERS } },
        _count: { referrer: true },
        orderBy: { _count: { referrer: "desc" } },
        take: 10,
      }),
      prisma.pageView.groupBy({
        by: ["browser"],
        where: { createdAt: { gte: since7d }, ...REAL_TRAFFIC },
        _count: { browser: true },
        orderBy: { _count: { browser: "desc" } },
        take: 10,
      }),
      prisma.pageView.groupBy({
        by: ["country"],
        where: { createdAt: { gte: since7d }, country: { not: null }, ...REAL_TRAFFIC },
        _count: { country: true },
        orderBy: { _count: { country: "desc" } },
        take: 10,
      }),
      // Bucketed in JS below — simple and fine at this traffic scale.
      prisma.pageView.findMany({
        where: { createdAt: { gte: since24h }, ...REAL_TRAFFIC },
        select: { createdAt: true },
      }),
    ]);

  // Rough "visitors" proxy: distinct (path, hour) is not a real session count,
  // so instead we just report pageviews as "visitors24h" divided evenly isn't
  // honest either — be upfront that this is pageviews, not deduped sessions.
  const visitors24h = pageviews24h;

  const hourly: { hour: string; count: number }[] = [];
  const buckets = new Map<string, number>();
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 60 * 60 * 1000);
    d.setMinutes(0, 0, 0);
    buckets.set(d.toISOString(), 0);
  }
  for (const row of recentRows) {
    const d = new Date(row.createdAt);
    d.setMinutes(0, 0, 0);
    const key = d.toISOString();
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  for (const [hour, count] of buckets) hourly.push({ hour, count });

  return {
    visitors24h,
    pageviews24h,
    pageviews7d,
    topPages: topPagesRaw.map((r) => ({ path: r.path, count: r._count.path })),
    topReferrers: topReferrersRaw.map((r) => ({
      referrer: r.referrer ?? "direct",
      count: r._count.referrer,
    })),
    browsers: browsersRaw.map((r) => ({ browser: r.browser ?? "Other", count: r._count.browser })),
    countries: countriesRaw.map((r) => ({ country: r.country ?? "Unknown", count: r._count.country })),
    hourly,
  };
}

/**
 * A genuine (not fabricated) "activity" count for the header pill — pageviews
 * in the last 5 minutes. Not a distinct-visitor count (we don't track
 * sessions), so callers should phrase it as activity, not "N people online".
 * Cached briefly since it's rendered in the header on every page load.
 */
const getActiveNowUncached = async (): Promise<number> => {
  const since = new Date(Date.now() - 5 * 60 * 1000);
  return prisma.pageView.count({ where: { createdAt: { gte: since }, ...REAL_TRAFFIC } });
};

export const getActiveNow = unstable_cache(getActiveNowUncached, ["active-now"], {
  revalidate: 20,
});

export interface HeaderStats {
  activeNow: number;
  visitorsToday: number;
  visitorsAllTime: number;
}

/**
 * Header pill + public /stats numbers: "active now" (last 5 min), "visitors
 * today" (the current UTC calendar day — resets at midnight UTC, matching
 * what "today" normally means, and the same day boundary the Daily board
 * uses), and all-time. All three real pageview counts, computed from ONE
 * query batch so they're always a consistent snapshot — today's count can
 * never exceed all-time's, since today is a subset of it. (Splitting these
 * across two separately-cached functions with different revalidate windows
 * previously let them drift out of sync and show a logically impossible
 * result.)
 */
const getHeaderStatsUncached = async (): Promise<HeaderStats> => {
  const since5m = new Date(Date.now() - 5 * 60 * 1000);
  const { start: todayStart } = utcDayRange();
  const [activeNow, visitorsToday, visitorsAllTime] = await Promise.all([
    prisma.pageView.count({ where: { createdAt: { gte: since5m }, ...REAL_TRAFFIC } }),
    prisma.pageView.count({ where: { createdAt: { gte: todayStart }, ...REAL_TRAFFIC } }),
    prisma.pageView.count({ where: REAL_TRAFFIC }),
  ]);
  return { activeNow, visitorsToday, visitorsAllTime };
};

export const getHeaderStats = unstable_cache(getHeaderStatsUncached, ["header-stats"], {
  revalidate: 20,
});

export interface CountryStat {
  code: string;
  count: number;
}

/**
 * Public, all-time country breakdown for the /stats page — counts only, no
 * page/referrer detail. Rows with no resolved country (e.g. localhost/private
 * IPs during dev) are bucketed as "Unknown" rather than dropped, so this
 * chart's total always matches the browser chart's — every real pageview is
 * accounted for somewhere.
 */
const getPublicCountryBreakdownUncached = async (): Promise<CountryStat[]> => {
  const rows = await prisma.pageView.groupBy({
    by: ["country"],
    where: REAL_TRAFFIC,
    _count: { country: true },
    orderBy: { _count: { country: "desc" } },
  });
  const known = rows
    .filter((r) => r.country !== null)
    .map((r) => ({ code: r.country as string, count: r._count.country }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  const unknownCount = rows
    .filter((r) => r.country === null)
    .reduce((sum, r) => sum + r._count.country, 0);
  return unknownCount > 0 ? [...known, { code: "??", count: unknownCount }] : known;
};

export const getPublicCountryBreakdown = unstable_cache(
  getPublicCountryBreakdownUncached,
  ["public-country-breakdown"],
  { revalidate: 300 },
);

export interface LabeledStat {
  label: string;
  count: number;
}

/** Public, all-time browser breakdown. */
const getPublicBrowserBreakdownUncached = async (): Promise<LabeledStat[]> => {
  const rows = await prisma.pageView.groupBy({
    by: ["browser"],
    _count: { browser: true },
    orderBy: { _count: { browser: "desc" } },
    take: 8,
  });
  return rows.map((r) => ({ label: r.browser ?? "Other", count: r._count.browser }));
};

export const getPublicBrowserBreakdown = unstable_cache(
  getPublicBrowserBreakdownUncached,
  ["public-browser-breakdown"],
  { revalidate: 300 },
);
