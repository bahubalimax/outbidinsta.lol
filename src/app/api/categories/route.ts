import { getActiveCategoriesForForm } from "@/lib/leaderboard";
import { handleApiError, jsonOk } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const categories = await getActiveCategoriesForForm();
    return jsonOk(
      { categories },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
    );
  } catch (err) {
    return handleApiError(err);
  }
}
