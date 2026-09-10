import { NextRequest } from "next/server";
import { boardQuerySchema } from "@/lib/validation";
import { getBoard } from "@/lib/leaderboard";
import { handleApiError, jsonOk } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const params = boardQuerySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams.entries()),
    );
    const result = await getBoard(params.board, {
      categorySlug: params.category,
      page: params.page,
      pageSize: params.pageSize,
      dateKey: params.date,
    });
    return jsonOk(result, {
      headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
