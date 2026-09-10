/**
 * Minimal structured logger. Swap for pino/winston in production if desired.
 * Kept dependency-free so it works in edge + node runtimes.
 */
type Level = "debug" | "info" | "warn" | "error";

function emit(level: Level, event: string, data?: Record<string, unknown>) {
  const line = {
    t: new Date().toISOString(),
    level,
    event,
    ...data,
  };
  const serialized = JSON.stringify(line, (_k, v) =>
    typeof v === "bigint" ? v.toString() : v,
  );
  if (level === "error") console.error(serialized);
  else if (level === "warn") console.warn(serialized);
  else console.log(serialized);
}

export const log = {
  debug: (event: string, data?: Record<string, unknown>) =>
    process.env.NODE_ENV === "development" && emit("debug", event, data),
  info: (event: string, data?: Record<string, unknown>) => emit("info", event, data),
  warn: (event: string, data?: Record<string, unknown>) => emit("warn", event, data),
  error: (event: string, data?: Record<string, unknown>) => emit("error", event, data),
};
