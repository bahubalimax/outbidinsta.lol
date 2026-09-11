"use client";

import { useEffect, useState } from "react";
import { TEST_MODE_LIVE_ETA } from "@/lib/site";

function formatCountdown(msLeft: number): string {
  const totalMinutes = Math.max(0, Math.floor(msLeft / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

/**
 * A news-ticker style bar announcing that payments are still in Dodo test
 * mode. Delete this component (and its import in layout.tsx) once merchant
 * verification clears and real payments go live — no other cleanup needed.
 */
export function TestModeTicker() {
  const [msLeft, setMsLeft] = useState<number | null>(null);

  useEffect(() => {
    const eta = new Date(TEST_MODE_LIVE_ETA).getTime();
    const tick = () => setMsLeft(eta - Date.now());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  if (msLeft !== null && msLeft <= 0) return null;

  const message =
    msLeft === null
      ? "Test mode — try it now, no real charges yet. Real payments go live soon!"
      : `Test mode — try it now, no real charges yet. Real payments go live in ${formatCountdown(msLeft)}!`;

  return (
    <div className="brand-gradient-bg overflow-hidden py-1.5 text-white">
      <div className="obi-marquee-track flex w-max whitespace-nowrap text-xs font-medium">
        {[0, 1].map((i) => (
          <span key={i} className="flex items-center" aria-hidden={i === 1}>
            {Array.from({ length: 6 }).map((_, j) => (
              <span key={j} className="mx-4 inline-flex items-center gap-2">
                <span aria-hidden>⚡</span>
                {message}
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}
