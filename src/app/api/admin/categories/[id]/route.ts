import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { assertSameOrigin, handleApiError, jsonError, jsonOk } from "@/lib/http";
import { categoryUpdateSchema } from "@/lib/validation";
import { updateCategory, deleteCategory } from "@/lib/admin-actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    assertSameOrigin(req);
    const { id } = await ctx.params;
    const body = await req.json().catch(() => null);
    const input = categoryUpdateSchema.parse(body);
    const category = await updateCategory(id, input);
    return jsonOk({ category });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    assertSameOrigin(req);
    const { id } = await ctx.params;
    const result = await deleteCategory(id);
    if (!result.deleted) {
      return jsonError(409, result.reason ?? "Cannot delete category", "CATEGORY_IN_USE");
    }
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
