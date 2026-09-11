"use client";

import { useEffect, useState } from "react";

function msUntilNextUtcMidnight(): number {
  const now = new Date();
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return next - now.getTime();
}

function formatHms(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Live countdown to the Daily board's actual UTC-midnight reset. Only meaningful on the current day — never render this on a frozen past-day archive. */
export function DailyResetCountdown() {
  const [ms, setMs] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setMs(msUntilNextUtcMidnight());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <p className="text-center text-xs text-muted-foreground">
      Resets every day at midnight UTC ·{" "}
      <span className="font-medium text-foreground tabular-nums">{ms === null ? "…" : formatHms(ms)}</span> left
    </p>
  );
}
