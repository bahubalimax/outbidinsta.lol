import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import {
  verifyStandardWebhook,
  signStandardWebhook,
  WebhookVerificationError,
} from "@/lib/webhook-verify";

const secret = "whsec_" + Buffer.from("super-secret-signing-key-value").toString("base64");

function build(payload: string, opts: { id?: string; ts?: number; secret?: string } = {}) {
  const id = opts.id ?? "evt_123";
  const ts = opts.ts ?? Math.floor(Date.now() / 1000);
  const sig = signStandardWebhook(opts.secret ?? secret, id, ts, payload);
  return {
    headers: {
      "webhook-id": id,
      "webhook-timestamp": String(ts),
      "webhook-signature": sig,
    },
    rawBody: payload,
  };
}

describe("Standard Webhooks verification", () => {
  const body = JSON.stringify({ type: "payment.succeeded", data: { payment_id: "pay_1" } });

  it("accepts a correctly signed payload and returns parsed JSON", () => {
    const { headers, rawBody } = build(body);
    const event = verifyStandardWebhook<{ type: string }>({ secret, rawBody, headers });
    expect(event.type).toBe("payment.succeeded");
  });

  it("accepts case-insensitive header names", () => {
    const { headers, rawBody } = build(body);
    const upper = {
      "Webhook-Id": headers["webhook-id"],
      "Webhook-Timestamp": headers["webhook-timestamp"],
      "Webhook-Signature": headers["webhook-signature"],
    };
    expect(() => verifyStandardWebhook({ secret, rawBody, headers: upper })).not.toThrow();
  });

  it("rejects a tampered body", () => {
    const { headers } = build(body);
    expect(() =>
      verifyStandardWebhook({ secret, rawBody: body + " ", headers }),
    ).toThrow(WebhookVerificationError);
  });

  it("rejects a wrong signing secret", () => {
    const { headers, rawBody } = build(body, { secret: "whsec_" + Buffer.from("other").toString("base64") });
    expect(() => verifyStandardWebhook({ secret, rawBody, headers })).toThrow(
      WebhookVerificationError,
    );
  });

  it("rejects an old timestamp", () => {
    const { headers, rawBody } = build(body, { ts: Math.floor(Date.now() / 1000) - 3600 });
    expect(() => verifyStandardWebhook({ secret, rawBody, headers })).toThrow(
      WebhookVerificationError,
    );
  });

  it("rejects a future timestamp", () => {
    const { headers, rawBody } = build(body, { ts: Math.floor(Date.now() / 1000) + 3600 });
    expect(() => verifyStandardWebhook({ secret, rawBody, headers })).toThrow(
      WebhookVerificationError,
    );
  });

  it("rejects missing headers", () => {
    expect(() =>
      verifyStandardWebhook({ secret, rawBody: body, headers: { "webhook-id": "x" } }),
    ).toThrow(WebhookVerificationError);
  });

  it("rejects a random signature", () => {
    const { headers, rawBody } = build(body);
    headers["webhook-signature"] = "v1," + crypto.randomBytes(32).toString("base64");
    expect(() => verifyStandardWebhook({ secret, rawBody, headers })).toThrow(
      WebhookVerificationError,
    );
  });

  it("accepts a signature header carrying multiple space-separated values", () => {
    const { headers, rawBody } = build(body);
    headers["webhook-signature"] = `v1,${crypto.randomBytes(32).toString("base64")} ${headers["webhook-signature"]}`;
    expect(() => verifyStandardWebhook({ secret, rawBody, headers })).not.toThrow();
  });
});
