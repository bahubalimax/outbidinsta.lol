import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { assertSameOrigin, handleApiError, jsonError, jsonOk } from "@/lib/http";
import { adminRefundPayment } from "@/lib/admin-actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ reason: z.string().trim().max(500).default("Admin refund") });

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    assertSameOrigin(req);
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const { reason } = schema.parse(body);
    const result = await adminRefundPayment(id, reason);
    if (!result.ok) return jsonError(409, result.reason ?? "Refund failed", "REFUND_FAILED");
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
