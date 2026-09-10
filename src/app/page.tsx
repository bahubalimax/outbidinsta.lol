import type { Metadata } from "next";
import { BoardScreen } from "@/components/board-screen";
import { SITE_DESCRIPTION } from "@/lib/site";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  description: SITE_DESCRIPTION,
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  return <BoardScreen board="all" page={page} categorySlug={sp.category} />;
}
