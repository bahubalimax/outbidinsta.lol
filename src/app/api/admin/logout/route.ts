import { NextRequest } from "next/server";
import { endAdminSession } from "@/lib/auth";
import { assertSameOrigin, handleApiError, jsonOk } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    await endAdminSession();
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
