import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { assertSameOrigin, handleApiError, jsonOk } from "@/lib/http";
import { categoryReorderSchema } from "@/lib/validation";
import { reorderCategories } from "@/lib/admin-actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    assertSameOrigin(req);
    const body = await req.json().catch(() => null);
    const { order } = categoryReorderSchema.parse(body);
    await reorderCategories(order);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
