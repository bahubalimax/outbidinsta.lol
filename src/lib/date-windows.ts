/** Time-window helpers for the Today (rolling) and Daily (UTC calendar) boards. */

/** Start of the UTC calendar day containing `d`. */
export function utcDayStart(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** [start, end) of the UTC calendar day containing `d`. */
export function utcDayRange(d = new Date()): { start: Date; end: Date } {
  const start = utcDayStart(d);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

/** "YYYY-MM-DD" for a UTC day. */
export function utcDateKey(d = new Date()): string {
  return utcDayStart(d).toISOString().slice(0, 10);
}

/** Parse "YYYY-MM-DD" into that UTC day's [start, end); null if malformed. */
export function parseUtcDateKey(key: string): { start: Date; end: Date; key: string } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const start = new Date(`${key}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end, key };
}

/** Rolling window of the last `hours` hours ending now. */
export function rollingWindow(hours: number, now = new Date()): { start: Date; end: Date } {
  return { start: new Date(now.getTime() - hours * 60 * 60 * 1000), end: now };
}

/** A short list of recent UTC day keys, newest first, for the Daily archive nav. */
export function recentDayKeys(count: number, from = new Date()): string[] {
  const out: string[] = [];
  const base = utcDayStart(from).getTime();
  for (let i = 0; i < count; i++) {
    out.push(new Date(base - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  }
  return out;
}

export function isToday(key: string): boolean {
  return key === utcDateKey();
}
