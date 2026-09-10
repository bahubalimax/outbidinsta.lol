/**
 * Centralised money / currency utility.
 *
 * RULES (see CLAUDE.md):
 *   - Money is ALWAYS stored and computed as integer MINOR UNITS (e.g. US cents).
 *   - NEVER use floating point for a monetary calculation.
 *   - Never scatter "$" through the codebase — format via `formatMoney` here.
 */

export interface CurrencyMeta {
  code: string;
  /** Number of minor-unit digits, e.g. 2 for USD, 0 for JPY. */
  decimals: number;
  /** Locale used for Intl formatting. */
  locale: string;
}

export const CURRENCIES: Record<string, CurrencyMeta> = {
  USD: { code: "USD", decimals: 2, locale: "en-US" },
  EUR: { code: "EUR", decimals: 2, locale: "en-IE" },
  GBP: { code: "GBP", decimals: 2, locale: "en-GB" },
  INR: { code: "INR", decimals: 2, locale: "en-IN" },
};

export const DEFAULT_CURRENCY = "USD";

export function getCurrency(code: string | null | undefined): CurrencyMeta {
  if (!code) return CURRENCIES[DEFAULT_CURRENCY];
  return CURRENCIES[code.toUpperCase()] ?? CURRENCIES[DEFAULT_CURRENCY];
}

export function isSupportedCurrency(code: string): boolean {
  return Object.prototype.hasOwnProperty.call(CURRENCIES, code.toUpperCase());
}

/** 10 ** decimals, computed with integers only. */
function minorPerMajor(decimals: number): number {
  let n = 1;
  for (let i = 0; i < decimals; i++) n *= 10;
  return n;
}

/**
 * Parse a user-entered amount ("5", "5.00", "$5", "1,250.50") into integer minor
 * units for the given currency. Throws on anything that isn't a clean amount or
 * that has more precision than the currency allows.
 */
export function parseAmountToMinor(input: string | number, currencyCode = DEFAULT_CURRENCY): number {
  const { decimals } = getCurrency(currencyCode);
  const raw = String(input).trim().replace(/[$£€₹]/g, "").replace(/,/g, "").trim();
  if (raw === "" || !/^\d+(\.\d+)?$/.test(raw)) {
    throw new Error(`Invalid amount: "${input}"`);
  }
  const [whole, frac = ""] = raw.split(".");
  if (frac.length > decimals) {
    throw new Error(`Amount "${input}" has more than ${decimals} decimal places`);
  }
  const fracPadded = (frac + "0".repeat(decimals)).slice(0, decimals);
  const minor = Number(whole) * minorPerMajor(decimals) + Number(fracPadded || "0");
  if (!Number.isSafeInteger(minor) || minor < 0) {
    throw new Error(`Amount out of range: "${input}"`);
  }
  return minor;
}

/** Whole-major-unit dollars -> minor units. `5` -> `500` for USD. Integer only. */
export function majorToMinor(major: number, currencyCode = DEFAULT_CURRENCY): number {
  const { decimals } = getCurrency(currencyCode);
  if (!Number.isFinite(major)) throw new Error("major must be finite");
  const minor = Math.round(major * minorPerMajor(decimals));
  return minor;
}

/** Minor units -> major units as a Number. FOR DISPLAY / FORMATTING ONLY. */
export function minorToMajor(minor: number, currencyCode = DEFAULT_CURRENCY): number {
  const { decimals } = getCurrency(currencyCode);
  return minor / minorPerMajor(decimals);
}

/**
 * Format minor units for display. Whole amounts render without decimals
 * ("$5"), fractional amounts keep them ("$5.50"), matching the leaderboard UX.
 */
export function formatMoney(
  minor: number,
  currencyCode = DEFAULT_CURRENCY,
  opts: { alwaysDecimals?: boolean } = {},
): string {
  const meta = getCurrency(currencyCode);
  const hasFraction = minor % minorPerMajor(meta.decimals) !== 0;
  const fractionDigits = opts.alwaysDecimals || hasFraction ? meta.decimals : 0;
  return new Intl.NumberFormat(meta.locale, {
    style: "currency",
    currency: meta.code,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: meta.decimals,
  }).format(minorToMajor(minor, currencyCode));
}

/** Just the currency symbol, e.g. "$". */
export function currencySymbol(currencyCode = DEFAULT_CURRENCY): string {
  const meta = getCurrency(currencyCode);
  const parts = new Intl.NumberFormat(meta.locale, {
    style: "currency",
    currency: meta.code,
  }).formatToParts(0);
  return parts.find((p) => p.type === "currency")?.value ?? "$";
}
