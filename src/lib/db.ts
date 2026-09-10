import "server-only";
import { PrismaClient } from "@prisma/client";

/**
 * Single shared PrismaClient. In dev, Next.js hot-reload would otherwise create
 * a new client on every change and exhaust the connection pool.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Error codes Prisma raises when a Serializable transaction cannot commit
 * because of a concurrent write. We retry those.
 */
const RETRYABLE_CODES = new Set(["P2034", "P2028"]);

/**
 * Run `fn` inside a Serializable transaction, retrying on write conflicts /
 * serialization failures. Used by the bid-confirmation path so concurrent
 * payments for the same listing are resolved deterministically.
 */
export async function runSerializable<T>(
  fn: (tx: Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0]) => Promise<T>,
  { retries = 4 }: { retries?: number } = {},
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await prisma.$transaction(fn, {
        isolationLevel: "Serializable",
        timeout: 15_000,
      });
    } catch (err: unknown) {
      lastErr = err;
      const code =
        typeof err === "object" && err !== null && "code" in err
          ? String((err as { code?: unknown }).code)
          : "";
      const isSerialization =
        RETRYABLE_CODES.has(code) ||
        (err instanceof Error && /could not serialize|deadlock detected|40001/i.test(err.message));
      if (!isSerialization || attempt === retries) throw err;
      // small jittered backoff
      await new Promise((r) => setTimeout(r, 25 * (attempt + 1) + Math.random() * 25));
    }
  }
  throw lastErr;
}
