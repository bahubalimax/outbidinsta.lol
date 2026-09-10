import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getAllTimeBoard } from "@/lib/leaderboard";
import { getSettings } from "@/lib/settings";
import { LeaderboardList } from "@/components/leaderboard-list";
import { BoardTabs } from "@/components/board-tabs";
import { Pagination } from "@/components/pagination";
import { formatMoney } from "@/lib/money";
import { absoluteUrl, SITE_NAME } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category) return { title: "Category not found" };
  const title = `${category.name} — Top Instagram Profiles`;
  return {
    title,
    description:
      category.description || `The ${category.name} leaderboard on ${SITE_NAME}. Outbid to claim #1.`,
    alternates: { canonical: `/category/${slug}` },
    openGraph: { title: `${title} — ${SITE_NAME}`, url: absoluteUrl(`/category/${slug}`) },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const pageSize = 25;

  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category) notFound();

  const [result, settings] = await Promise.all([
    getAllTimeBoard({ categorySlug: slug, page, pageSize }),
    getSettings(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 pt-4 pb-16">
      <nav className="text-sm text-muted-foreground">
        <Link href="/categories" className="hover:text-foreground">
          Categories
        </Link>{" "}
        / <span className="text-foreground">{category.name}</span>
      </nav>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {category.name} — Top Instagram Profiles
        </h1>
        {category.description && (
          <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
        )}
        <p className="mt-1 text-sm text-muted-foreground">
          To claim #1 here: {formatMoney(result.claimTopCents, settings.currency)}.
        </p>
        {!category.active && (
          <p className="mt-2 text-sm text-warning">This category is hidden from browsing.</p>
        )}
      </div>

      <BoardTabs active="all" />

      <LeaderboardList rows={result.rows} tiered={page === 1} />

      <Pagination
        page={page}
        totalPages={result.totalPages}
        total={result.total}
        pageSize={pageSize}
        hrefForPage={(p) => `/category/${slug}${p > 1 ? `?page=${p}` : ""}`}
      />
    </div>
  );
}
