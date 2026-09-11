"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const DISMISS_KEY = "obi-try-now-popup-dismissed-at";
const SNOOZE_MS = 15 * 60 * 1000;
const AUTO_CLOSE_MS = 2000;

function recentlyDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    return Date.now() - Number(raw) < SNOOZE_MS;
  } catch {
    return false;
  }
}

function markDismissed(): void {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    /* ignore — private browsing, storage disabled, etc. */
  }
}

/**
 * Full-screen "try now, it costs nothing" nudge. Shows once per 15-minute
 * window (per browser), auto-closes after 2s if left alone. Same lifecycle
 * as <TestModeTicker/> — see TRY_NOW_POPUP_ENABLED in src/lib/site.ts.
 */
export function TryNowPopup() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (recentlyDismissed()) return;
    setVisible(true);
    const timer = setTimeout(() => dismiss(), AUTO_CLOSE_MS);
    return () => clearTimeout(timer);
  }, []);

  function dismiss() {
    setVisible(false);
    markDismissed();
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Try OutBidInsta for free"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={dismiss}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-3xl border border-border bg-card p-6 text-center shadow-2xl"
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="absolute top-3 right-3 grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <svg viewBox="0 0 24 24" fill="none" className="size-4" aria-hidden>
            <path
              d="M6 6l12 12M18 6 6 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <div className="brand-gradient-bg mx-auto flex size-12 items-center justify-center rounded-2xl text-2xl text-white">
          ⚡
        </div>

        <h2 className="brand-gradient-text mt-4 text-2xl font-bold tracking-tight">
          Try now — it costs nothing
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          We&apos;re in test mode — claim a rank and see how it works. No real charges yet.
        </p>

        <Link
          href="/#claim"
          onClick={dismiss}
          className="brand-gradient-bg mt-5 inline-flex h-11 w-full items-center justify-center rounded-full px-5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
        >
          Try Now
        </Link>
      </div>
    </div>
  );
}
