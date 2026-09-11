"use client";

import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Fires one lightweight beacon per page view to /api/track. Runs after the
 * page has already painted (useEffect), so it never delays or blocks a
 * render — a slow or failing beacon has zero effect on the site.
 */
function Beacon() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname?.startsWith("/admin")) return;
    const path = searchParams?.toString() ? `${pathname}?${searchParams}` : pathname;
    const body = JSON.stringify({ path, referrer: document.referrer || null });

    try {
      const blob = new Blob([body], { type: "application/json" });
      if (!navigator.sendBeacon?.("/api/track", blob)) {
        fetch("/api/track", { method: "POST", body, keepalive: true }).catch(() => {});
      }
    } catch {
      // Analytics must never throw into the app.
    }
  }, [pathname, searchParams]);

  return null;
}

export function AnalyticsBeacon() {
  return (
    <Suspense fallback={null}>
      <Beacon />
    </Suspense>
  );
}
