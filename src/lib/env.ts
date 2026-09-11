import "server-only";

/**
 * Centralised, validated access to server environment variables.
 * Never import this from a Client Component.
 */

function required(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

function optional(name: string, fallback = ""): string {
  return process.env[name]?.trim() || fallback;
}

const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

/** Lazily-evaluated so `next build` doesn't require secrets to be present. */
export const env = {
  get databaseUrl() {
    return isBuildPhase ? optional("DATABASE_URL") : required("DATABASE_URL");
  },
  get siteUrl() {
    return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  },
  get dodoApiKey() {
    return required("DODO_API_KEY");
  },
  get dodoWebhookSecret() {
    return required("DODO_WEBHOOK_SECRET");
  },
  get dodoEnvironment(): "test_mode" | "live_mode" {
    return optional("DODO_ENVIRONMENT", "test_mode") === "live_mode" ? "live_mode" : "test_mode";
  },
  get dodoBidProductId() {
    return required("DODO_BID_PRODUCT_ID");
  },
  get adminEmail() {
    return required("ADMIN_EMAIL").toLowerCase();
  },
  get adminPassword() {
    return required("ADMIN_PASSWORD");
  },
  get authSecret() {
    const s = isBuildPhase ? optional("AUTH_SECRET", "build-time-placeholder-secret-value-000") : required("AUTH_SECRET");
    if (!isBuildPhase && s.length < 32) {
      throw new Error("AUTH_SECRET must be at least 32 characters");
    }
    return s;
  },
  get supportedCurrencies(): string[] {
    const raw = optional("SUPPORTED_CURRENCIES", "USD,EUR,GBP,INR");
    const list = raw
      .split(",")
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);
    return list.includes("USD") ? list : ["USD", ...list];
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
  get reconcileSecret() {
    return isBuildPhase ? optional("RECONCILE_SECRET") : required("RECONCILE_SECRET");
  },
};
