import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { absoluteUrl } from "@/lib/site";
import { log } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Outbound Instagram click redirect — every "View on Instagram" link on the
 * site points here instead of straight to instagram.com, so we can count a
 * real, verifiable click before handing the visitor off. This is the only
 * "clicks" number this app will ever show: no estimates, no third-party
 * scraping, just our own redirect logging its own traffic.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const listing = await prisma.listing.findUnique({
      where: { id },
      select: { instagramUrl: true },
    });
    if (!listing) return NextResponse.redirect(absoluteUrl("/"));

    // One counted click per visitor per listing per 10 minutes — stops a
    // trivial refresh-mash from inflating the count. Always redirect
    // regardless; a rate-limited hit just isn't counted twice.
    const ip = clientIp(req.headers);
    const limited = rateLimit(`click:${id}:${ip}`, 1, 10 * 60_000);
    if (limited.ok) {
      await prisma.listing.update({
        where: { id },
        data: { clickCount: { increment: 1 } },
      });
    }

    return NextResponse.redirect(listing.instagramUrl, { status: 302 });
  } catch (err) {
    log.warn("go.redirect_failed", { err: String(err), id });
    return NextResponse.redirect(absoluteUrl("/"));
  }
}
