import { NextRequest } from "next/server";
import { getRecentActivity } from "@/lib/activity";
import { handleApiError, jsonOk } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const limit = Number.parseInt(req.nextUrl.searchParams.get("limit") ?? "25", 10) || 25;
    const events = await getRecentActivity(limit);
    return jsonOk(
      {
        events: events.map((e) => ({
          id: e.id,
          type: e.type,
          username: e.username,
          categorySlug: e.categorySlug,
          rank: e.rank,
          amountCents: e.amountCents,
          totalCents: e.totalCents,
          currency: e.currency,
          createdAt: e.createdAt,
        })),
      },
      { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" } },
    );
  } catch (err) {
    return handleApiError(err);
  }
}
