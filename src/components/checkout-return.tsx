"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Alert, Card } from "@/components/ui";
import { ShareTicket } from "@/components/share-ticket";
import { SITE_NAME } from "@/lib/site";

interface Status {
  outcome:
    | "pending"
    | "applied"
    | "applied_below_target"
    | "voided"
    | "refunded"
    | "failed"
    | "cancelled"
    | "disputed";
  chargeFormatted: string;
  lifetimeTotalFormatted: string;
  username: string;
  category: { name: string; slug: string };
  globalRank: number | null;
  categoryRank: number | null;
  note?: string;
}

export function CheckoutReturn({ bidId }: { bidId: string }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tries, setTries] = useState(0);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;

    async function poll(attempt: number) {
      try {
        const res = await fetch(`/api/bids/${encodeURIComponent(bidId)}`);
        if (!res.ok) throw new Error("lookup failed");
        const data: Status = await res.json();
        if (!alive) return;
        setStatus(data);
        setTries(attempt);
        if (data.outcome === "pending" && attempt < 12) {
          timer = setTimeout(() => poll(attempt + 1), attempt < 4 ? 1500 : 3000);
        }
      } catch {
        if (!alive) return;
        setError("Couldn't load your bid status. It may still be processing.");
      }
    }
    poll(0);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [bidId]);

  if (error && !status) return <Alert tone="warning">{error}</Alert>;
  if (!status) {
    return <Card className="p-6 text-center text-sm text-muted-foreground">Checking your payment…</Card>;
  }

  const profileHref = `/profile/${status.username}`;
  const rankLine =
    (status.globalRank ? `#${status.globalRank} overall` : "on the board") +
    (status.categoryRank ? ` · #${status.categoryRank} in ${status.category.name}` : "");

  if (status.outcome === "pending") {
    return (
      <Card className="p-6 text-center">
        <div className="obi-pulse mx-auto mb-3 size-3 rounded-full bg-primary" />
        <p className="font-semibold">Confirming your payment…</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Your rank updates the moment we get a verified confirmation from the payment provider.
          {tries > 3 ? " This is taking a little longer than usual — you can safely close this page." : ""}
        </p>
        <Link href={profileHref} className="mt-4 inline-block text-sm font-medium text-primary">
          View @{status.username} →
        </Link>
      </Card>
    );
  }

  if (status.outcome === "applied" || status.outcome === "applied_below_target") {
    const shareText =
      status.globalRank === 1
        ? `I'm currently #1 on ${SITE_NAME} 🔥 Can you outbid me?`
        : `@${status.username} is #${status.globalRank ?? "—"} on ${SITE_NAME}. Outbid to take the top spot.`;

    return (
      <Card className="p-6 text-center">
        <p className="text-3xl">{status.outcome === "applied" ? "🎉" : "✅"}</p>
        <p className="mt-2 text-lg font-semibold">
          @{status.username} is {rankLine}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          You paid {status.chargeFormatted}. Lifetime total: {status.lifetimeTotalFormatted}.
        </p>
        {status.note && <p className="mt-2 text-sm text-muted-foreground">{status.note}</p>}
        <Link
          href={profileHref}
          className="mt-4 inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
        >
          View the listing
        </Link>
        <div className="mt-6">
          <ShareTicket username={status.username} text={shareText} />
        </div>
      </Card>
    );
  }

  if (status.outcome === "voided" || status.outcome === "refunded") {
    return (
      <Card className="p-6 text-center">
        <p className="font-semibold">
          {status.outcome === "voided" ? "This payment couldn't be applied" : "This bid was refunded"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {status.note ?? "See the refund policy for details."}
        </p>
        <Link href="/refund-policy" className="mt-4 inline-block text-sm font-medium text-primary">
          Refund policy →
        </Link>
      </Card>
    );
  }

  return (
    <Card className="p-6 text-center">
      <p className="font-semibold">
        {status.outcome === "cancelled" ? "Checkout cancelled" : "Payment didn't go through"}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        You were not charged. You can try again from the listing.
      </p>
      <Link href={profileHref} className="mt-4 inline-block text-sm font-medium text-primary">
        Back to @{status.username} →
      </Link>
    </Card>
  );
}
