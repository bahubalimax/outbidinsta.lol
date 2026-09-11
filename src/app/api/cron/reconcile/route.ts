import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { retrieveCheckoutSession } from "@/lib/dodo";
import { confirmBidPayment, handlePaymentFailed, handlePaymentCancelled } from "@/lib/payments";
import { jsonOk, jsonError, handleApiError } from "@/lib/http";
import { log } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/cron/reconcile
 *
 * Safety-net poller: Dodo's webhook has been unreliable at reaching us, so
 * this checks Dodo directly for any PENDING payment that actually succeeded
 * (or failed/cancelled) and applies the same confirmation path a verified
 * webhook would. Runs on a schedule (see .github/workflows/reconcile.yml),
 * not tied to any one payment — nothing here trusts the browser, everything
 * is re-verified against Dodo's own API. Auth: a shared bearer secret, since
 * the caller is a scheduler, not a logged-in admin or Dodo itself.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${env.reconcileSecret}`) {
      return jsonError(401, "Unauthorized");
    }

    // Skip anything younger than 60s (still mid-checkout) or older than 48h
    // (almost certainly abandoned — leave it as pending, don't keep polling).
    const tooYoung = new Date(Date.now() - 60_000);
    const tooOld = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const pending = await prisma.payment.findMany({
      where: {
        status: "pending",
        provider: "dodo",
        providerCheckoutId: { not: null },
        createdAt: { lte: tooYoung, gte: tooOld },
      },
      orderBy: { createdAt: "asc" },
      take: 50,
    });

    const results: { paymentId: string; action: string; error?: string }[] = [];

    for (const payment of pending) {
      try {
        const session = await retrieveCheckoutSession(payment.providerCheckoutId!);
        const metadata = (payment.metadata as Record<string, unknown>) ?? {};

        if (session.payment_status === "succeeded" && session.payment_id) {
          await confirmBidPayment({
            providerPaymentId: session.payment_id,
            checkoutSessionId: payment.providerCheckoutId,
            metadata,
            paidAmountCents: null,
            currency: null,
          });
          results.push({ paymentId: payment.id, action: "confirmed" });
        } else if (session.payment_status === "failed") {
          await handlePaymentFailed(session.payment_id ?? payment.providerCheckoutId!, "reconciler_detected_failed", metadata);
          results.push({ paymentId: payment.id, action: "marked_failed" });
        } else if (session.payment_status === "cancelled") {
          await handlePaymentCancelled(session.payment_id ?? payment.providerCheckoutId!, metadata);
          results.push({ paymentId: payment.id, action: "marked_cancelled" });
        } else {
          results.push({ paymentId: payment.id, action: "still_pending" });
        }
      } catch (err) {
        log.error("reconcile.payment_error", { paymentId: payment.id, err: String(err) });
        results.push({ paymentId: payment.id, action: "error", error: String(err) });
      }
    }

    const applied = results.filter((r) => r.action === "confirmed").length;
    if (applied > 0) log.info("reconcile.applied", { applied, checked: pending.length });

    return jsonOk({ checked: pending.length, applied, results });
  } catch (err) {
    return handleApiError(err);
  }
}
