import { describe, it, expect } from "vitest";
import {
  parseAmountToMinor,
  majorToMinor,
  minorToMajor,
  formatMoney,
  currencySymbol,
  isSupportedCurrency,
} from "@/lib/money";

describe("money utilities", () => {
  it("parses whole and fractional amounts to integer minor units", () => {
    expect(parseAmountToMinor("5", "USD")).toBe(500);
    expect(parseAmountToMinor("5.00", "USD")).toBe(500);
    expect(parseAmountToMinor("5.5", "USD")).toBe(550);
    expect(parseAmountToMinor("$1,250.50", "USD")).toBe(125050);
    expect(parseAmountToMinor("17006", "USD")).toBe(1700600);
    expect(parseAmountToMinor(10, "USD")).toBe(1000);
  });

  it("rejects invalid or over-precise amounts", () => {
    expect(() => parseAmountToMinor("abc", "USD")).toThrow();
    expect(() => parseAmountToMinor("5.005", "USD")).toThrow();
    expect(() => parseAmountToMinor("-5", "USD")).toThrow();
    expect(() => parseAmountToMinor("", "USD")).toThrow();
  });

  it("majorToMinor / minorToMajor round-trip", () => {
    expect(majorToMinor(10)).toBe(1000);
    expect(minorToMajor(1000)).toBe(10);
    expect(minorToMajor(550)).toBe(5.5);
  });

  it("formats whole amounts without decimals and fractional with", () => {
    expect(formatMoney(500, "USD")).toBe("$5");
    expect(formatMoney(550, "USD")).toBe("$5.50");
    expect(formatMoney(1700600, "USD")).toBe("$17,006");
    expect(formatMoney(500, "USD", { alwaysDecimals: true })).toBe("$5.00");
  });

  it("never produces floating point drift", () => {
    let total = 0;
    for (let i = 0; i < 100; i++) total += parseAmountToMinor("0.10", "USD");
    expect(total).toBe(1000);
  });

  it("knows supported currencies and symbols", () => {
    expect(isSupportedCurrency("usd")).toBe(true);
    expect(isSupportedCurrency("xyz")).toBe(false);
    expect(currencySymbol("USD")).toBe("$");
  });
});
