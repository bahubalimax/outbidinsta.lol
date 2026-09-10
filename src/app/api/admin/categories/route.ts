import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { assertSameOrigin, handleApiError, jsonOk } from "@/lib/http";
import { categoryInputSchema } from "@/lib/validation";
import { createCategory } from "@/lib/admin-actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { listings: true } } },
    });
    return jsonOk({ categories });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    assertSameOrigin(req);
    const body = await req.json().catch(() => null);
    const input = categoryInputSchema.parse(body);
    const category = await createCategory(input);
    return jsonOk({ category }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
