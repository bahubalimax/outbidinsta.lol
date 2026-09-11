import "server-only";
import DodoPayments from "dodopayments";
import { env } from "@/lib/env";
import { log } from "@/lib/logger";

/**
 * Thin wrapper around the official Dodo Payments SDK.
 * We only use documented SDK methods — no invented/undocumented parameters.
 */

let _client: DodoPayments | null = null;

export function dodo(): DodoPayments {
  if (!_client) {
    _client = new DodoPayments({
      bearerToken: env.dodoApiKey,
      webhookKey: env.dodoWebhookSecret,
      environment: env.dodoEnvironment,
      maxRetries: 2,
    });
  }
  return _client;
}

export interface CreateBidCheckoutInput {
  /** minor units (e.g. cents) — the pay-what-you-want amount for the bid */
  amountCents: number;
  currency: string;
  /** Omitted for guest bids — Dodo's own hosted checkout collects it instead. */
  email?: string;
  listingId: string;
  bidId: string;
  userId: string;
  username: string;
}

export interface CreatedCheckout {
  checkoutUrl: string;
  sessionId: string;
}

/**
 * Create a hosted Dodo checkout session for a single bid.
 *
 * Requires ONE Dodo product (DODO_BID_PRODUCT_ID) configured with
 * "Pay what you want" pricing in USD — the `amount` on the cart item carries the
 * dynamic bid price in minor units.
 *
 * Metadata is attached so the webhook can resolve the bid without trusting the
 * browser. Dodo metadata values must be primitives.
 */
export async function createBidCheckout(input: CreateBidCheckoutInput): Promise<CreatedCheckout> {
  const returnUrl = `${env.siteUrl}/checkout/return?bid=${encodeURIComponent(input.bidId)}`;
  const cancelUrl = `${env.siteUrl}/profile/${encodeURIComponent(input.username)}?checkout=cancelled`;

  const session = await dodo().checkoutSessions.create({
    product_cart: [
      {
        product_id: env.dodoBidProductId,
        quantity: 1,
        amount: input.amountCents,
      },
    ],
    customer: input.email ? { email: input.email } : null,
    return_url: returnUrl,
    cancel_url: cancelUrl,
    metadata: {
      listingId: input.listingId,
      bidId: input.bidId,
      userId: input.userId,
      bidAmountCents: String(input.amountCents),
      currency: input.currency,
      app: "outbidinsta",
    },
  });

  if (!session.checkout_url) {
    log.error("dodo.checkout.no_url", { sessionId: session.session_id, bidId: input.bidId });
    throw new Error("Dodo did not return a checkout URL");
  }

  return { checkoutUrl: session.checkout_url, sessionId: session.session_id };
}

/** Issue a refund for a captured payment. Used by the refund policy. */
export async function refundPayment(providerPaymentId: string, reason: string): Promise<void> {
  await dodo().refunds.create({ payment_id: providerPaymentId, reason: reason.slice(0, 3000) });
}

/** Retrieve a payment to reconcile status on the /checkout/return page. */
export async function retrievePayment(providerPaymentId: string) {
  return dodo().payments.retrieve(providerPaymentId);
}
