import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { BoardScreen } from "@/components/board-screen";
import { parseUtcDateKey, utcDateKey } from "@/lib/date-windows";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ date: string }>;
}): Promise<Metadata> {
  const { date } = await params;
  return {
    title: `Daily · ${date}`,
    description: `The OutBidInsta daily leaderboard for ${date} (UTC).`,
    alternates: { canonical: `/daily/${date}` },
    robots: { index: false, follow: true },
  };
}

export default async function DailyArchivePage({
  params,
  searchParams,
}: {
  params: Promise<{ date: string }>;
  searchParams: Promise<{ page?: string; category?: string }>;
}) {
  const { date } = await params;
  const sp = await searchParams;

  const parsed = parseUtcDateKey(date);
  if (!parsed) notFound();
  if (date === utcDateKey()) redirect("/daily");
  if (parsed.start.getTime() > Date.now()) notFound();

  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  return <BoardScreen board="daily" page={page} categorySlug={sp.category} dateKey={date} />;
}
