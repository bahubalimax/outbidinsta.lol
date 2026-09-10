import { describe, it, expect } from "vitest";
import {
  utcDayStart,
  utcDayRange,
  utcDateKey,
  parseUtcDateKey,
  rollingWindow,
  recentDayKeys,
  isToday,
} from "@/lib/date-windows";

describe("date windows", () => {
  it("utcDayStart zeroes the time in UTC", () => {
    const d = new Date("2026-09-11T15:23:45.678Z");
    expect(utcDayStart(d).toISOString()).toBe("2026-09-11T00:00:00.000Z");
  });

  it("utcDayRange spans exactly 24h", () => {
    const { start, end } = utcDayRange(new Date("2026-09-11T15:00:00Z"));
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
    expect(start.toISOString()).toBe("2026-09-11T00:00:00.000Z");
  });

  it("utcDateKey formats YYYY-MM-DD", () => {
    expect(utcDateKey(new Date("2026-01-05T23:59:00Z"))).toBe("2026-01-05");
  });

  it("parseUtcDateKey parses valid keys and rejects junk", () => {
    const p = parseUtcDateKey("2026-09-10");
    expect(p?.key).toBe("2026-09-10");
    expect(p?.start.toISOString()).toBe("2026-09-10T00:00:00.000Z");
    expect(parseUtcDateKey("2026-9-10")).toBeNull();
    expect(parseUtcDateKey("nonsense")).toBeNull();
  });

  it("rollingWindow ends now and starts N hours earlier", () => {
    const now = new Date("2026-09-11T12:00:00Z");
    const { start, end } = rollingWindow(24, now);
    expect(end).toBe(now);
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it("recentDayKeys returns N keys newest-first", () => {
    const keys = recentDayKeys(3, new Date("2026-09-11T05:00:00Z"));
    expect(keys).toEqual(["2026-09-11", "2026-09-10", "2026-09-09"]);
  });

  it("isToday matches the current UTC day", () => {
    expect(isToday(utcDateKey())).toBe(true);
    expect(isToday("1999-01-01")).toBe(false);
  });
});
