/**
 * Centralised refund / reinstatement policy.
 *
 * In the lifetime-spend model every confirmed payment counts toward a listing's
 * rank, so the "paid too late to claim the position" problem is much smaller:
 * your money still raises your rank, you just may not land where you aimed.
 *
 * All the "what happens to money and rank when X" decisions live here so the
 * business rules can be changed in ONE place.
 */
import type { AppSettings } from "@/lib/settings";

export const CLAIM_MISSED_MESSAGE =
  "The top spot moved while your payment was clearing. Your payment still counts toward your rank.";

export const VOID_MESSAGE =
  "This listing became unavailable before your payment cleared. Your payment is being refunded according to the refund policy.";

export interface RefundPolicy {
  /** Auto-refund payments that could not be applied at all (listing removed). */
  autoRefundVoided: boolean;
  /** A refunded confirmed contribution is subtracted from the listing total. */
  subtractRefundedFromTotal: boolean;
  /** A disputed confirmed contribution is subtracted from the listing total. */
  subtractDisputedFromTotal: boolean;
  /** Confirmed contributions that landed below the intended rank are refunded. */
  autoRefundMissedClaim: boolean;
}

export function refundPolicyFrom(settings: AppSettings): RefundPolicy {
  return {
    autoRefundVoided: settings.autoRefundVoided,
    subtractRefundedFromTotal: true,
    subtractDisputedFromTotal: true,
    // Matches outbid.lol: a payment that counts toward your rank is not refunded
    // just because #1 moved. Flip this if you want the stricter behaviour.
    autoRefundMissedClaim: false,
  };
}
