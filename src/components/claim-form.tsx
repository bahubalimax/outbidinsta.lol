"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { Alert, cn } from "@/components/ui";
import { IconInstagram, IconHeart } from "@/components/icons";
import { formatMoney, minorToMajor } from "@/lib/money";
import { SITE_NAME } from "@/lib/site";

interface CategoryOption {
  name: string;
  slug: string;
}

interface LookupState {
  loading: boolean;
  valid: boolean | null;
  exists: boolean;
  username?: string;
  listingId?: string;
  lifetimeTotalCents: number;
  minTargetCents: number;
  categorySlug?: string;
  categoryName?: string;
  globalRank?: number | null;
}

export interface ClaimFormProps {
  categories: CategoryOption[];
  /** Target lifetime total to claim #1 on the current board. */
  claimTopCents: number;
  startingBidCents: number;
  minIncrementCents: number;
  currency: string;
  prefillHandle?: string;
  prefillTargetCents?: number;
  /** New listings/bids are paused — show a closed notice instead of the form. */
  closed?: boolean;
}

export function ClaimForm({
  categories,
  claimTopCents,
  startingBidCents,
  minIncrementCents,
  currency,
  prefillHandle,
  prefillTargetCents,
  closed = false,
}: ClaimFormProps) {
  const [handle, setHandle] = useState(prefillHandle ?? "");
  const [categorySlug, setCategorySlug] = useState("");
  const [targetCents, setTargetCents] = useState(prefillTargetCents ?? claimTopCents);
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const [lookup, setLookup] = useState<LookupState>({
    loading: false,
    valid: null,
    exists: false,
    lifetimeTotalCents: 0,
    minTargetCents: startingBidCents,
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const incMajor = Math.max(1, Math.round(minorToMajor(minIncrementCents, currency)));
  const minCents = lookup.exists ? lookup.minTargetCents : startingBidCents;
  const dollars = Math.max(0, Math.round(minorToMajor(targetCents, currency)));
  const chargeCents = lookup.exists
    ? Math.max(0, targetCents - lookup.lifetimeTotalCents)
    : targetCents;

  const runLookup = useCallback(
    (q: string) => {
      if (!q.trim()) {
        setLookup({
          loading: false,
          valid: null,
          exists: false,
          lifetimeTotalCents: 0,
          minTargetCents: startingBidCents,
        });
        return;
      }
      setLookup((s) => ({ ...s, loading: true }));
      fetch(`/api/listings/lookup?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((data) => {
          const next: LookupState = {
            loading: false,
            valid: !!data.valid,
            exists: !!data.exists,
            username: data.username,
            listingId: data.listingId,
            lifetimeTotalCents: data.lifetimeTotalCents ?? 0,
            minTargetCents: data.minTargetCents ?? startingBidCents,
            categorySlug: data.category?.slug,
            categoryName: data.category?.name,
            globalRank: data.globalRank,
          };
          setLookup(next);
          if (next.categorySlug) setCategorySlug(next.categorySlug);
          setTargetCents((prev) => {
            const floor = next.exists ? next.minTargetCents : startingBidCents;
            if (touched && prev >= floor) return prev;
            return next.exists ? next.minTargetCents : Math.max(claimTopCents, floor);
          });
        })
        .catch(() => setLookup((s) => ({ ...s, loading: false })));
    },
    [startingBidCents, claimTopCents, touched],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runLookup(handle), 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [handle, runLookup]);

  const step = (dir: 1 | -1) => {
    setTouched(true);
    setTargetCents((prev) => {
      const nextDollars = Math.round(minorToMajor(prev, currency)) + dir * incMajor;
      return Math.max(minCents, Math.round(nextDollars) * 100);
    });
  };
  const onType = (raw: string) => {
    setTouched(true);
    const digits = raw.replace(/[^\d]/g, "").slice(0, 9);
    setTargetCents(digits === "" ? 0 : Number(digits) * 100);
  };

  const belowMin = targetCents < minCents;
  const categoryLocked = lookup.exists && !!lookup.categorySlug;

  const helper = useMemo(() => {
    if (lookup.loading) return "Checking…";
    if (handle && lookup.valid === false) return "That doesn't look like an Instagram profile.";
    if (lookup.exists) {
      const rank = lookup.globalRank ? `#${lookup.globalRank} overall` : "on the board";
      return `@${lookup.username} is ${rank} · lifetime ${formatMoney(
        lookup.lifetimeTotalCents,
        currency,
      )}. You'll pay ${formatMoney(chargeCents, currency)} to raise it to ${formatMoney(
        targetCents,
        currency,
      )}.`;
    }
    if (lookup.valid && lookup.username)
      return `@${lookup.username} isn't listed yet — new listings start at ${formatMoney(
        startingBidCents,
        currency,
      )}.`;
    return "";
  }, [lookup, handle, currency, startingBidCents, chargeCents, targetCents]);

  function openConfirm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (closed) return setError("New listings are paused right now — launching again shortly!");
    if (!handle.trim()) return setError("Enter your Instagram profile or @username.");
    if (!lookup.exists && !categorySlug) return setError("Choose a category.");
    if (belowMin) return setError(`The minimum total is ${formatMoney(minCents, currency)}.`);
    setAgreed(false);
    setShowConfirm(true);
  }

  async function confirmAndCheckout() {
    if (!agreed) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          lookup.listingId
            ? {
                listingId: lookup.listingId,
                amount: String(minorToMajor(targetCents, currency)),
                intendedTop: true,
              }
            : {
                instagram: handle,
                categorySlug,
                amount: String(minorToMajor(targetCents, currency)),
                intendedTop: true,
              },
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.details?.minTargetCents) {
          setLookup((s) => ({ ...s, minTargetCents: data.details.minTargetCents, exists: true }));
          setTargetCents(data.details.minTargetCents);
        }
        setShowConfirm(false);
        setError(data?.error ?? "Could not start checkout.");
        setSubmitting(false);
        return;
      }
      window.location.href = data.checkoutUrl;
    } catch {
      setShowConfirm(false);
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <section id="claim" className="relative scroll-mt-6">
      <span
        aria-hidden
        className="obi-float absolute top-0 left-[6%] hidden size-9 items-center justify-center rounded-2xl bg-white text-[#e1306c] shadow-md ring-1 ring-black/5 md:flex"
        style={{ "--obi-float-rot": "-8deg" } as CSSProperties}
      >
        <IconHeart className="size-4.5" />
      </span>
      <span
        aria-hidden
        className="obi-float-slow brand-gradient-bg absolute top-2 right-[8%] hidden size-9 items-center justify-center rounded-2xl text-white shadow-md md:flex"
        style={{ "--obi-float-rot": "7deg" } as CSSProperties}
      >
        <IconInstagram className="size-4.5" />
      </span>

      <h2 className="mx-auto max-w-4xl text-center text-[28px] font-semibold tracking-[-0.03em] text-pretty md:text-[40px]">
        <span>Claim #1 for</span>{" "}
        <span className="inline-flex items-center gap-2 align-middle whitespace-nowrap">
          <button
            type="button"
            aria-label="Lower the bid"
            onClick={() => step(-1)}
            disabled={targetCents <= minCents}
            className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/15 text-primary transition-colors hover:bg-primary/25 disabled:opacity-40"
          >
            <span className="text-sm leading-none">−</span>
          </button>
          <label className="relative inline-block underline decoration-dashed decoration-2 underline-offset-[6px] [text-decoration-color:var(--primary)]">
            <span className="sr-only">Bid amount in dollars</span>
            <span className="invisible whitespace-nowrap tabular-nums" aria-hidden>
              ${dollars}
            </span>
            <span className="absolute inset-0 flex items-baseline">
              <span className="brand-gradient-text" aria-hidden>
                $
              </span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={String(dollars)}
                onChange={(e) => onType(e.target.value)}
                className="brand-gradient-text w-full min-w-0 bg-transparent p-0 font-[inherit] tracking-[inherit] tabular-nums outline-none"
              />
            </span>
          </label>
          <button
            type="button"
            aria-label="Raise the bid"
            onClick={() => step(1)}
            className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/15 text-primary transition-colors hover:bg-primary/25"
          >
            <span className="text-sm leading-none">+</span>
          </button>
        </span>
      </h2>

      <form onSubmit={openConfirm} className="mx-auto mt-3 flex w-full max-w-4xl flex-col gap-2">
        <div className="mx-auto flex w-[92%] flex-col items-stretch gap-2.5 md:w-full md:flex-row md:flex-wrap md:items-center md:gap-3">
          <div className="relative min-w-0 flex-1 md:min-w-[240px]">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
              <IconInstagram className="size-4" />
            </span>
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="Paste your Instagram profile or @username"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              aria-label="Instagram profile or username"
              className="h-11 w-full min-w-0 rounded-xl border border-input bg-popover pr-3.5 pl-10 text-base placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
            />
          </div>

          <div className="min-w-0 md:w-56 md:shrink-0">
            <select
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value)}
              disabled={categoryLocked}
              aria-label="Choose a category"
              className="h-11 w-full min-w-0 appearance-none rounded-xl border border-input bg-popover px-3.5 text-[13px] text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none disabled:opacity-60"
            >
              <option value="">
                {categoryLocked ? `Category: ${lookup.categoryName}` : "Choose a category"}
              </option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="brand-gradient-bg inline-flex h-11 w-full shrink-0 items-center justify-center rounded-full px-5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50 md:w-44"
          >
            {submitting
              ? "Starting…"
              : `Claim rank · ${formatMoney(chargeCents || minCents, currency)}`}
          </button>
        </div>

        {helper && (
          <p
            className={cn(
              "mx-auto max-w-4xl px-1 text-center text-xs",
              lookup.valid === false ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {helper}
          </p>
        )}
        {error && (
          <div className="mx-auto mt-1 w-[92%] max-w-md md:w-full">
            <Alert tone="error">{error}</Alert>
          </div>
        )}
        <p className="mx-auto max-w-4xl px-1 text-center text-[11px] text-muted-foreground">
          Secure checkout. Your rank changes only after payment is confirmed.
        </p>
      </form>

      {showConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm this rank"
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => !submitting && setShowConfirm(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl"
          >
            <h2 className="text-xl font-semibold tracking-tight">Confirm this rank</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Check the details and agree to the Terms of Service to continue.
            </p>

            <div className="mt-4 flex items-center justify-between rounded-2xl bg-muted/60 px-4 py-3.5">
              <div>
                <p className="text-xs text-muted-foreground">Instagram</p>
                <p className="font-semibold">@{lookup.username || handle.replace(/^@/, "")}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Due now</p>
                <p className="font-semibold text-primary">
                  {formatMoney(chargeCents || minCents, currency)}
                </p>
              </div>
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              {lookup.categoryName ?? categories.find((c) => c.slug === categorySlug)?.name}. A
              listing at that rank on the public board. It goes live once payment is confirmed —
              someone else can still claim a higher rank first.
            </p>

            <label className="mt-4 flex items-start gap-2.5 rounded-xl border border-input px-3.5 py-3 text-sm">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-primary"
              />
              <span>
                I have read and agree to the{" "}
                <Link href="/terms" target="_blank" className="font-medium text-primary underline">
                  Terms of Service
                </Link>{" "}
                of {SITE_NAME}
              </span>
            </label>

            <div className="mt-1.5 flex gap-3 text-xs text-muted-foreground">
              <Link href="/privacy" target="_blank" className="underline hover:text-foreground">
                Privacy
              </Link>
              <Link href="/rules" target="_blank" className="underline hover:text-foreground">
                Rules
              </Link>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={submitting}
                className="h-11 flex-1 rounded-full border border-input text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmAndCheckout}
                disabled={!agreed || submitting}
                className="brand-gradient-bg h-11 flex-1 rounded-full text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? "Starting…" : "Continue to checkout"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
