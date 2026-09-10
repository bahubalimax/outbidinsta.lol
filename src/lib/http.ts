import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { ZodError } from "zod";

/** Standard JSON error envelope. */
export interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
}

export function jsonOk<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, init);
}

export function jsonError(
  status: number,
  message: string,
  code?: string,
  details?: unknown,
): NextResponse {
  const body: ApiError = { error: message };
  if (code) body.code = code;
  if (details !== undefined) body.details = details;
  return NextResponse.json(body, { status });
}

/**
 * CSRF defense for state-changing requests: require that the request originates
 * from our own site. Browsers always send Origin on cross-site POST; same-origin
 * requests send a matching Origin (or, for older cases, a same-host Referer).
 */
export function assertSameOrigin(req: Request): void {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return;

  const allowed = new Set<string>();
  try {
    allowed.add(new URL(env.siteUrl).origin);
  } catch {
    /* ignore */
  }
  const host = req.headers.get("host");
  if (host) {
    allowed.add(`https://${host}`);
    allowed.add(`http://${host}`);
  }

  const origin = req.headers.get("origin");
  if (origin) {
    if (!allowed.has(origin)) throw new CsrfError();
    return;
  }
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      if (!allowed.has(new URL(referer).origin)) throw new CsrfError();
      return;
    } catch {
      throw new CsrfError();
    }
  }
  // No Origin and no Referer on a mutating request — reject.
  throw new CsrfError();
}

export class CsrfError extends Error {
  constructor() {
    super("Cross-origin request blocked");
    this.name = "CsrfError";
  }
}

/** Convert thrown errors into a consistent API response. */
export function handleApiError(err: unknown): NextResponse {
  if (err instanceof CsrfError) {
    return jsonError(403, "Request blocked", "CSRF");
  }
  if (err instanceof ZodError) {
    return jsonError(422, "Invalid input", "VALIDATION", err.flatten());
  }
  if (err instanceof Error && err.name === "UnauthorizedError") {
    return jsonError(401, "Unauthorized", "UNAUTHORIZED");
  }
  if (err instanceof Error && err.name === "InvalidInstagramError") {
    return jsonError(422, err.message, "INVALID_INSTAGRAM");
  }
  console.error("[api] unhandled error", err);
  return jsonError(500, "Something went wrong", "INTERNAL");
}
