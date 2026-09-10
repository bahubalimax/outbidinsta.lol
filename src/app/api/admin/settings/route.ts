import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { assertSameOrigin, handleApiError, jsonOk } from "@/lib/http";
import { settingsUpdateSchema } from "@/lib/validation";
import { getSettings } from "@/lib/settings";
import { saveSettings } from "@/lib/admin-actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    return jsonOk({ settings: await getSettings(true) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin();
    assertSameOrigin(req);
    const body = await req.json().catch(() => null);
    const patch = settingsUpdateSchema.parse(body);
    const settings = await saveSettings(patch);
    return jsonOk({ settings });
  } catch (err) {
    return handleApiError(err);
  }
}
