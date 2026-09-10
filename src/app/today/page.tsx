import type { Metadata } from "next";
import { BoardScreen } from "@/components/board-screen";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Today",
  description: "The rolling 24-hour OutBidInsta leaderboard.",
  alternates: { canonical: "/today" },
};

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  return <BoardScreen board="today" page={page} categorySlug={sp.category} />;
}
