import crypto from "node:crypto";

/**
 * Standard Webhooks (https://www.standardwebhooks.com/) signature verification.
 * Dodo Payments follows this spec. Implemented directly (no runtime dep) so it
 * is fully unit-testable.
 *
 * Signature base string:  `${id}.${timestamp}.${rawBody}`
 * Signature header:       space-separated `v1,<base64(hmacSHA256)>` entries.
 */

export interface StandardWebhookHeaders {
  "webhook-id": string;
  "webhook-timestamp": string;
  "webhook-signature": string;
}

export class WebhookVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookVerificationError";
  }
}

const TOLERANCE_SECONDS = 5 * 60;

/** Decode the signing secret to raw bytes, accepting `whsec_` + base64 or raw. */
function decodeSecret(secret: string): Buffer {
  const s = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret;
  if (/^[A-Za-z0-9+/=_-]+$/.test(s)) {
    try {
      const b = Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
      if (b.length > 0) return b;
    } catch {
      /* fall through */
    }
  }
  return Buffer.from(secret, "utf8");
}

function sign(secretBytes: Buffer, id: string, timestamp: string, body: string): string {
  return crypto
    .createHmac("sha256", secretBytes)
    .update(`${id}.${timestamp}.${body}`, "utf8")
    .digest("base64");
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export interface VerifyInput {
  secret: string;
  rawBody: string;
  headers: Record<string, string | undefined | null>;
  /** Override "now" for tests (ms since epoch). */
  now?: number;
}

/**
 * Verify a Standard Webhooks request. Returns the parsed JSON payload on
 * success, throws WebhookVerificationError otherwise.
 */
export function verifyStandardWebhook<T = unknown>(input: VerifyInput): T {
  const get = (name: string): string => {
    // headers may arrive with different casing
    for (const [k, v] of Object.entries(input.headers)) {
      if (k.toLowerCase() === name && typeof v === "string") return v;
    }
    return "";
  };

  const id = get("webhook-id");
  const timestamp = get("webhook-timestamp");
  const signatureHeader = get("webhook-signature");

  if (!id || !timestamp || !signatureHeader) {
    throw new WebhookVerificationError("Missing required webhook headers");
  }

  // Timestamp tolerance
  const ts = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(ts)) {
    throw new WebhookVerificationError("Invalid webhook-timestamp");
  }
  const nowSec = Math.floor((input.now ?? Date.now()) / 1000);
  if (nowSec - ts > TOLERANCE_SECONDS) {
    throw new WebhookVerificationError("Webhook timestamp too old");
  }
  if (ts - nowSec > TOLERANCE_SECONDS) {
    throw new WebhookVerificationError("Webhook timestamp too far in the future");
  }

  const secretBytes = decodeSecret(input.secret);
  const expected = sign(secretBytes, id, timestamp, input.rawBody);

  const presented = signatureHeader
    .split(" ")
    .map((part) => {
      const [version, value] = part.split(",");
      return value && (version === "v1" || version === "v1a") ? value : part;
    })
    .filter(Boolean);

  const matched = presented.some((sig) => timingSafeEqualStr(sig, expected));
  if (!matched) {
    throw new WebhookVerificationError("Webhook signature mismatch");
  }

  try {
    return JSON.parse(input.rawBody) as T;
  } catch {
    throw new WebhookVerificationError("Webhook payload is not valid JSON");
  }
}

/** Helper for tests / local tooling: build a valid signature header. */
export function signStandardWebhook(
  secret: string,
  id: string,
  timestampSeconds: number,
  rawBody: string,
): string {
  const sig = sign(decodeSecret(secret), id, String(timestampSeconds), rawBody);
  return `v1,${sig}`;
}
