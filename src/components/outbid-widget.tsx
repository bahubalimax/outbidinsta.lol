"use client";

import { useState } from "react";
import { Alert } from "@/components/ui";
import { formatMoney, minorToMajor } from "@/lib/money";

export function OutbidWidget({
  listingId,
  lifetimeTotalCents,
  minNextTargetCents,
  minIncrementCents,
  currency,
  biddable,
}: {
  listingId: string;
  lifetimeTotalCents: number;
  minNextTargetCents: number;
  minIncrementCents: number;
  currency: string;
  biddable: boolean;
}) {
  const [targetCents, setTargetCents] = useState(minNextTargetCents);
  const [minCents, setMinCents] = useState(minNextTargetCents);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const incMajor = Math.max(1, Math.round(minorToMajor(minIncrementCents, currency)));
  const dollars = Math.max(0, Math.round(minorToMajor(targetCents, currency)));
  const chargeCents = Math.max(0, targetCents - lifetimeTotalCents);

  const step = (dir: 1 | -1) =>
    setTargetCents((prev) => {
      const d = Math.round(minorToMajor(prev, currency)) + dir * incMajor;
      return Math.max(minCents, Math.round(d) * 100);
    });
  const onType = (raw: string) => {
    const digits = raw.replace(/[^\d]/g, "").slice(0, 9);
    setTargetCents(digits === "" ? 0 : Number(digits) * 100);
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) return setError("Enter your email for the receipt.");
    if (targetCents < minCents) return setError(`The minimum total is ${formatMoney(minCents, currency)}.`);

    setSubmitting(true);
    try {
      const res = await fetch("/api/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          amount: String(minorToMajor(targetCents, currency)),
          email,
          intendedTop: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.details?.minTargetCents) {
          setMinCents(data.details.minTargetCents);
          setTargetCents(data.details.minTargetCents);
        }
        setError(data?.error ?? "Could not start checkout.");
        setSubmitting(false);
        return;
      }
      window.location.href = data.checkoutUrl;
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  if (!biddable) {
    return <Alert tone="warning">This listing is not currently accepting bids.</Alert>;
  }

  return (
    <form onSubmit={onSubmit} id="outbid" className="rounded-2xl border border-border bg-card p-4">
      <p className="text-sm font-semibold">Raise this profile&apos;s rank</p>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label="Lower"
          disabled={targetCents <= minCents}
          className="grid size-11 place-items-center rounded-xl border border-border text-lg font-bold hover:bg-muted disabled:opacity-40"
        >
          −
        </button>
        <label className="flex-1 text-center">
          <span className="sr-only">Target lifetime total</span>
          <span className="flex items-baseline justify-center text-2xl font-semibold tabular-nums">
            <span aria-hidden>$</span>
            <input
              type="text"
              inputMode="numeric"
              value={String(dollars)}
              onChange={(e) => onType(e.target.value)}
              className="w-[5ch] bg-transparent text-center outline-none"
            />
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            you pay {formatMoney(chargeCents, currency)} · min {formatMoney(minCents, currency)}
          </span>
        </label>
        <button
          type="button"
          onClick={() => step(1)}
          aria-label="Raise"
          className="grid size-11 place-items-center rounded-xl border border-border text-lg font-bold hover:bg-muted"
        >
          +
        </button>
      </div>

      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email for your receipt"
        autoComplete="email"
        aria-label="Email address"
        className="mt-3 h-11 w-full rounded-xl border border-input bg-popover px-3.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
      />

      {error && (
        <div className="mt-3">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="brand-gradient-bg mt-3 h-11 w-full rounded-full text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {submitting
          ? "Starting checkout…"
          : `Outbid · pay ${formatMoney(chargeCents || minCents, currency)}`}
      </button>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Rank changes only after your payment is confirmed.
      </p>
    </form>
  );
}
