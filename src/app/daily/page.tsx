import type { Metadata } from "next";
import { BoardScreen } from "@/components/board-screen";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Daily",
  description: "The OutBidInsta daily leaderboard — one UTC calendar day.",
  alternates: { canonical: "/daily" },
};

export default async function DailyPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  return <BoardScreen board="daily" page={page} categorySlug={sp.category} />;
}
