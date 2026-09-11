import "server-only";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";

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
  hourly: { hour: string; count: number }[];
}

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const now = new Date();
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [pageviews24h, pageviews7d, topPagesRaw, topReferrersRaw, browsersRaw, recentRows] =
    await Promise.all([
      prisma.pageView.count({ where: { createdAt: { gte: since24h } } }),
      prisma.pageView.count({ where: { createdAt: { gte: since7d } } }),
      prisma.pageView.groupBy({
        by: ["path"],
        where: { createdAt: { gte: since7d } },
        _count: { path: true },
        orderBy: { _count: { path: "desc" } },
        take: 10,
      }),
      prisma.pageView.groupBy({
        by: ["referrer"],
        where: { createdAt: { gte: since7d }, referrer: { not: null } },
        _count: { referrer: true },
        orderBy: { _count: { referrer: "desc" } },
        take: 10,
      }),
      prisma.pageView.groupBy({
        by: ["browser"],
        where: { createdAt: { gte: since7d } },
        _count: { browser: true },
        orderBy: { _count: { browser: "desc" } },
        take: 10,
      }),
      // Bucketed in JS below — simple and fine at this traffic scale.
      prisma.pageView.findMany({
        where: { createdAt: { gte: since24h } },
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
  return prisma.pageView.count({ where: { createdAt: { gte: since } } });
};

export const getActiveNow = unstable_cache(getActiveNowUncached, ["active-now"], {
  revalidate: 20,
});
