"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface S {
  startingBidCents: number;
  minIncrementCents: number;
  takeTopIncrementCents: number;
  maxBidCents: number;
  currency: string;
  todayWindowHours: number;
  dailyBoardEnabled: boolean;
  listingsEnabled: boolean;
  biddingEnabled: boolean;
  autoRefundVoided: boolean;
}

const CENT_FIELDS = [
  ["startingBidCents", "Starting bid (new listing minimum)"],
  ["minIncrementCents", "Minimum increment"],
  ["takeTopIncrementCents", "Extra over #1 to take #1"],
  ["maxBidCents", "Maximum lifetime total"],
] as const;

export function SettingsForm({ initial }: { initial: S }) {
  const router = useRouter();
  const [s, setS] = useState<S>(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function setDollars(key: keyof S, dollars: string) {
    const cents = Math.round(Number(dollars.replace(/[^\d.]/g, "")) * 100);
    if (Number.isFinite(cents)) setS((p) => ({ ...p, [key]: cents }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setError(null);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d?.error ?? "Save failed");
      return;
    }
    setMsg("Saved.");
    router.refresh();
  }

  return (
    <form onSubmit={save} className="max-w-lg space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {CENT_FIELDS.map(([key, label]) => (
          <label key={key} className="text-sm">
            <span className="block text-xs text-muted-foreground">{label}</span>
            <input
              type="text"
              inputMode="decimal"
              defaultValue={(s[key] / 100).toString()}
              onChange={(e) => setDollars(key, e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-input bg-popover px-3"
            />
          </label>
        ))}
        <label className="text-sm">
          <span className="block text-xs text-muted-foreground">Currency</span>
          <input
            value={s.currency}
            onChange={(e) => setS((p) => ({ ...p, currency: e.target.value.toUpperCase() }))}
            maxLength={3}
            className="mt-1 h-9 w-full rounded-lg border border-input bg-popover px-3"
          />
        </label>
        <label className="text-sm">
          <span className="block text-xs text-muted-foreground">Today window (hours)</span>
          <input
            type="number"
            min={1}
            max={168}
            value={s.todayWindowHours}
            onChange={(e) => setS((p) => ({ ...p, todayWindowHours: Number(e.target.value) }))}
            className="mt-1 h-9 w-full rounded-lg border border-input bg-popover px-3"
          />
        </label>
      </div>

      <div className="space-y-2">
        {(
          [
            ["dailyBoardEnabled", "Show the Daily board"],
            ["listingsEnabled", "Allow new listings"],
            ["biddingEnabled", "Allow bidding"],
            ["autoRefundVoided", "Auto-refund payments that can't be applied"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={s[key]}
              onChange={(e) => setS((p) => ({ ...p, [key]: e.target.checked }))}
            />
            {label}
          </label>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {msg && <p className="text-sm text-success">{msg}</p>}

      <button
        type="submit"
        disabled={busy}
        className="h-10 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
      >
        {busy ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
