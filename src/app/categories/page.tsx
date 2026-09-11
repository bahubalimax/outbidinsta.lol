import Link from "next/link";
import type { Metadata } from "next";
import { getTopCategories } from "@/lib/leaderboard";
import { Card } from "@/components/ui";
import { IconTag } from "@/components/icons";
import { formatMoney } from "@/lib/money";

// A small, cheerful palette in the site's Instagram-gradient spirit. Purely
// decorative — assigned deterministically by slug so a category always gets
// the same tile color across renders.
const TILE_COLORS = [
  { bg: "#f3ecff", fg: "#6a3df5" },
  { bg: "#ffe9f1", fg: "#e1306c" },
  { bg: "#fff1e0", fg: "#f9a13b" },
  { bg: "#e7f6ff", fg: "#0ea5e9" },
  { bg: "#e8fbf3", fg: "#10b981" },
  { bg: "#fff9db", fg: "#d4a017" },
];

function tileColor(slug: string) {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  return TILE_COLORS[hash % TILE_COLORS.length];
}

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
        {categories.map((c) => {
          const tile = tileColor(c.slug);
          return (
            <Link key={c.slug} href={`/category/${c.slug}`}>
              <Card className="h-full p-4 transition-colors hover:border-primary/40 hover:bg-muted/40">
                <div className="flex items-center gap-3">
                  <span
                    className="grid size-10 shrink-0 place-items-center rounded-xl"
                    style={{ background: tile.bg, color: tile.fg }}
                    aria-hidden
                  >
                    <IconTag className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-semibold">{c.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {c.listingCount} listed
                      </span>
                    </div>
                    <p className="line-clamp-1 text-xs text-muted-foreground">{c.description}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm font-semibold tabular-nums">
                  {c.topTotalCents != null
                    ? `Top ${formatMoney(c.topTotalCents, c.currency)}`
                    : "No bids yet"}
                </p>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
