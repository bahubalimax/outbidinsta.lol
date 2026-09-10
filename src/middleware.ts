import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/auth-token";

/**
 * Protects /admin and /api/admin. The login endpoints are public. All other
 * admin routes require a valid signed session cookie.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAdminPage = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAdminApi = pathname.startsWith("/api/admin");
  const isLoginPage = pathname === "/admin/login";
  const isLoginApi = pathname === "/api/admin/login";
  const isLogoutApi = pathname === "/api/admin/logout";

  if ((!isAdminPage && !isAdminApi) || isLoginPage || isLoginApi || isLogoutApi) {
    return applySecurityHeaders(NextResponse.next());
  }

  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  const secret = process.env.AUTH_SECRET ?? "";
  const session = token && secret ? await verifyAdminToken(token, secret) : null;

  if (!session) {
    if (isAdminApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return applySecurityHeaders(NextResponse.next());
}

function applySecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  return res;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
