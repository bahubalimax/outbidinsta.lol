import type { Metadata } from "next";
import { getRecentActivity } from "@/lib/activity";
import { ActivityFeed, type ActivityItem } from "@/components/activity-feed";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Activity",
  description: "Recent bids and rank changes on OutBidInsta.",
  alternates: { canonical: "/activity" },
};

export default async function ActivityPage() {
  const events = await getRecentActivity(80);
  const items: ActivityItem[] = events.map((e) => ({
    id: e.id,
    type: e.type,
    username: e.username,
    categorySlug: e.categorySlug,
    rank: e.rank,
    amountCents: e.amountCents,
    totalCents: e.totalCents,
    currency: e.currency,
    createdAt: e.createdAt,
  }));

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-6 pb-16">
      <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Confirmed bids and rank changes. No personal or payment information is shown.
      </p>
      <div className="mt-6">
        <ActivityFeed items={items} />
      </div>
    </div>
  );
}
