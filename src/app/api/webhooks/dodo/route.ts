import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { verifyStandardWebhook, WebhookVerificationError } from "@/lib/webhook-verify";
import {
  confirmBidPayment,
  handlePaymentFailed,
  handlePaymentCancelled,
  handleRefundSucceeded,
  handleDisputeOpened,
} from "@/lib/payments";
import { log } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/dodo
 *
 * - verifies the Standard Webhooks signature (rejects invalid)
 * - idempotent: each provider event id is processed at most once
 * - a bid only becomes valid here, after verified payment
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => (headers[k] = v));

  // 1. Verify signature ---------------------------------------------------
  let event: DodoEvent;
  try {
    event = verifyStandardWebhook<DodoEvent>({
      secret: env.dodoWebhookSecret,
      rawBody,
      headers,
    });
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      log.warn("webhook.dodo.invalid_signature", { message: err.message });
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
    log.error("webhook.dodo.verify_error", { err: String(err) });
    return NextResponse.json({ error: "Verification failed" }, { status: 400 });
  }

  const eventId =
    headers["webhook-id"] ||
    (typeof event === "object" && event && "id" in event ? String((event as { id?: unknown }).id) : "") ||
    `${event.type}:${event.timestamp}`;
  const eventType = event.type ?? "unknown";

  // 2. Idempotency: record the event (unique on provider+eventId) --------
  let webhookRowId: string;
  let alreadyProcessed = false;
  try {
    const row = await prisma.webhookEvent.create({
      data: {
        provider: "dodo",
        eventId,
        eventType,
        payload: event as unknown as Prisma.InputJsonValue,
        processed: false,
      },
    });
    webhookRowId = row.id;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const existing = await prisma.webhookEvent.findUnique({
        where: { provider_eventId: { provider: "dodo", eventId } },
      });
      if (!existing) {
        return NextResponse.json({ error: "conflict" }, { status: 409 });
      }
      webhookRowId = existing.id;
      alreadyProcessed = existing.processed;
    } else {
      log.error("webhook.dodo.persist_error", { err: String(err) });
      return NextResponse.json({ error: "storage error" }, { status: 500 });
    }
  }

  if (alreadyProcessed) {
    return NextResponse.json({ received: true, deduped: true });
  }

  // 3. Process ----------------------------------------------------------
  try {
    await processEvent(event);
    await prisma.webhookEvent.update({
      where: { id: webhookRowId },
      data: { processed: true, processedAt: new Date(), error: null },
    });
    log.info("webhook.dodo.processed", { eventId, eventType });
    return NextResponse.json({ received: true });
  } catch (err) {
    await prisma.webhookEvent.update({
      where: { id: webhookRowId },
      data: { error: String(err instanceof Error ? err.message : err) },
    });
    log.error("webhook.dodo.process_error", { eventId, eventType, err: String(err) });
    // 500 => Dodo retries; our idempotency + processed flag make that safe.
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
}

// ---- Event routing --------------------------------------------------

interface DodoEvent {
  type: string;
  timestamp?: string;
  data?: {
    payment_id?: string;
    checkout_session_id?: string | null;
    metadata?: Record<string, unknown>;
    total_amount?: number;
    currency?: string;
    error_message?: string | null;
    error_code?: string | null;
  };
}

async function processEvent(event: DodoEvent): Promise<void> {
  const data = event.data ?? {};
  const paymentId = data.payment_id ?? "";
  const metadata = data.metadata ?? {};

  switch (event.type) {
    case "payment.succeeded":
      if (!paymentId) throw new Error("payment.succeeded without payment_id");
      await confirmBidPayment({
        providerPaymentId: paymentId,
        checkoutSessionId: data.checkout_session_id ?? null,
        metadata,
        paidAmountCents: data.total_amount ?? null,
        currency: data.currency ?? null,
      });
      break;

    case "payment.failed":
      if (paymentId) {
        await handlePaymentFailed(paymentId, data.error_message ?? data.error_code ?? null, metadata);
      }
      break;

    case "payment.cancelled":
      if (paymentId) await handlePaymentCancelled(paymentId, metadata);
      break;

    case "refund.succeeded":
      if (paymentId) await handleRefundSucceeded(paymentId, metadata);
      break;

    case "dispute.opened":
    case "dispute.accepted":
    case "dispute.lost":
      if (paymentId) await handleDisputeOpened(paymentId, metadata);
      break;

    default:
      // Acknowledge unhandled event types without error.
      log.debug("webhook.dodo.unhandled_type", { type: event.type });
  }
}
