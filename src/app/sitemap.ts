import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes = [
    "",
    "/leaderboard",
    "/categories",
    "/activity",
    "/how-it-works",
    "/rules",
    "/faq",
    "/terms",
    "/privacy",
    "/refund-policy",
    "/contact",
  ].map((p) => ({
    url: `${SITE_URL}${p}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: p === "" ? 1 : 0.6,
  }));

  let categories: { slug: string; updatedAt: Date }[] = [];
  let listings: { username: string; updatedAt: Date }[] = [];
  try {
    [categories, listings] = await Promise.all([
      prisma.category.findMany({ where: { active: true }, select: { slug: true, updatedAt: true } }),
      prisma.listing.findMany({
        where: { status: "ACTIVE" },
        select: { username: true, updatedAt: true },
        orderBy: { totalCents: "desc" },
        take: 5000,
      }),
    ]);
  } catch {
    /* DB not reachable at build — ship static routes only */
  }

  return [
    ...staticRoutes,
    ...categories.map((c) => ({
      url: `${SITE_URL}/category/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.5,
    })),
    ...listings.map((l) => ({
      url: `${SITE_URL}/profile/${l.username}`,
      lastModified: l.updatedAt,
      changeFrequency: "hourly" as const,
      priority: 0.4,
    })),
  ];
}
