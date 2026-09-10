import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { assertSameOrigin, handleApiError, jsonOk } from "@/lib/http";
import { adminListingActionSchema, adminChangeCategorySchema } from "@/lib/validation";
import { applyListingAction, changeListingCategory } from "@/lib/admin-actions";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        category: true,
        bids: { orderBy: { createdAt: "desc" }, include: { bidder: true } },
        payments: { orderBy: { createdAt: "desc" } },
      },
    });
    return jsonOk({ listing });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    assertSameOrigin(req);
    const { id } = await ctx.params;
    const body = await req.json().catch(() => null);

    if (body && typeof body === "object" && "categoryId" in body) {
      const { categoryId } = adminChangeCategorySchema.parse(body);
      await changeListingCategory(id, categoryId);
      return jsonOk({ ok: true });
    }

    const { action } = adminListingActionSchema.parse(body);
    await applyListingAction(id, action);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
