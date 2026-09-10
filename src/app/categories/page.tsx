import Link from "next/link";
import type { Metadata } from "next";
import { getTopCategories } from "@/lib/leaderboard";
import { Card } from "@/components/ui";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Categories",
  description: "Browse Instagram profile leaderboards by category on OutBidInsta.",
  alternates: { canonical: "/categories" },
};

export default async function CategoriesPage() {
  const categories = await getTopCategories();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pt-4 pb-16">
      <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Every category has its own leaderboard. Pick one to see the top profiles.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <Link key={c.slug} href={`/category/${c.slug}`}>
            <Card className="h-full p-4 transition-colors hover:border-primary/40 hover:bg-muted/40">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{c.name}</span>
                <span className="text-xs text-muted-foreground">{c.listingCount} listed</span>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.description}</p>
              <p className="mt-3 text-sm font-semibold tabular-nums">
                {c.topTotalCents != null
                  ? `Top ${formatMoney(c.topTotalCents, c.currency)}`
                  : "No bids yet"}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
