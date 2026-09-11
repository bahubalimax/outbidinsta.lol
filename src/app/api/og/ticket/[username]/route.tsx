import { ImageResponse } from "next/og";
import { getProfileView } from "@/lib/profile";
import { formatMoney } from "@/lib/money";
import { SITE_NAME } from "@/lib/site";
import { prisma } from "@/lib/db";
import { fetchInstagramAvatarUrl, toAvatarDataUri } from "@/lib/instagram-avatar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WIDTH = 1080;
const HEIGHT = 1350;
const BRAND_GRADIENT = "linear-gradient(135deg, #6a3df5 0%, #e1306c 55%, #f9a13b 100%)";

/**
 * A shareable "ticket" card for a claimed/raised rank — generated on demand,
 * cached at the edge. Used by <ShareTicket> on the checkout-return page and
 * the profile page. Pure image generation; no state changes here.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username: raw } = await params;
  const username = decodeURIComponent(raw).toLowerCase();

  let view = null;
  try {
    view = await getProfileView(username);
  } catch {
    view = null;
  }

  const handle = view?.username ?? username;
  const rank = view?.globalRank ?? null;
  const category = view?.category.name ?? "Instagram";
  const currency = view?.currency ?? "USD";
  const initial = handle.replace(/[^a-z0-9]/gi, "").slice(0, 1).toUpperCase() || "?";
  const dateLabel = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // Real profile photo when we can get one — never blocks on failure, the
  // initials ring above is always the fallback.
  let avatarUrl = view?.avatarUrl ?? null;
  if (view && !avatarUrl) {
    avatarUrl = await fetchInstagramAvatarUrl(handle);
    if (avatarUrl) {
      await prisma.listing.update({ where: { id: view.listingId }, data: { avatarUrl } }).catch(() => {});
    }
  }
  const avatarDataUri = avatarUrl ? await toAvatarDataUri(avatarUrl) : null;

  const headline = "Top Bidder";
  const subtitle =
    rank === 1
      ? "Certified #1 bidder"
      : rank
        ? "Certified top-ranked bidder"
        : "Certified leaderboard listing";

  const latestBid = view?.history[0] ?? null;
  const amountCents = latestBid?.amountCents ?? view?.lifetimeTotalCents ?? 0;
  const amountLabel = latestBid ? "Bid Amount" : "Lifetime Total";
  const bidIdTail = latestBid
    ? latestBid.id.replace(/[^a-z0-9]/gi, "").slice(-6).toUpperCase()
    : null;

  const statCells: { label: string; value: string }[] = [
    { label: "Rank", value: rank ? `#${rank}` : "—" },
    { label: amountLabel, value: formatMoney(amountCents, currency) },
  ];
  if (bidIdTail) statCells.push({ label: "Bid ID", value: `BID${bidIdTail}` });

  const primaryName = (view?.displayName || handle).toUpperCase();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#17141d",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            width: 880,
            height: 1150,
            borderRadius: 48,
            padding: "56px 64px",
            background: "linear-gradient(160deg, #f4e9ff 0%, #ffe1ee 45%, #fff2df 100%)",
            boxShadow: "0 40px 100px rgba(0,0,0,0.45)",
          }}
        >
          {/* Ticket notches */}
          <div
            style={{
              position: "absolute",
              left: -44,
              top: 560,
              width: 88,
              height: 88,
              borderRadius: 999,
              background: "#17141d",
              display: "flex",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: -44,
              top: 560,
              width: 88,
              height: 88,
              borderRadius: 999,
              background: "#17141d",
              display: "flex",
            }}
          />

          {/* Top row: logo mark (left) + rank badge (right) */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "flex-start",
              justifyContent: "space-between",
              width: "100%",
            }}
          >
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 14 }}>
              <svg width="44" height="40" viewBox="0 0 36 32" fill="none">
                <rect x="22" y="0" width="14" height="6" rx="3" fill="#f9a13b" />
                <rect x="12" y="11" width="24" height="6" rx="3" fill="#e1306c" />
                <rect x="0" y="22" width="36" height="6" rx="3" fill="#6a3df5" />
              </svg>
              <div
                style={{
                  display: "flex",
                  fontSize: 22,
                  fontWeight: 700,
                  letterSpacing: 1,
                  color: "#a3372f",
                  textTransform: "uppercase",
                }}
              >
                {SITE_NAME}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
              <div
                style={{
                  display: "flex",
                  fontSize: 20,
                  fontWeight: 700,
                  letterSpacing: 3,
                  color: "#9a8f89",
                  textTransform: "uppercase",
                }}
              >
                {rank ? "Ranked" : "On Board"}
              </div>
              <div style={{ display: "flex", fontSize: 56, fontWeight: 800, color: "#241f1c" }}>
                {rank ? `#${rank}` : "—"}
              </div>
            </div>
          </div>

          {/* Avatar with gradient ring + crown badge */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 44 }}>
            <div style={{ position: "relative", display: "flex", width: 208, height: 208 }}>
              <div
                style={{
                  display: "flex",
                  width: 208,
                  height: 208,
                  borderRadius: 999,
                  background: BRAND_GRADIENT,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    width: 192,
                    height: 192,
                    borderRadius: 999,
                    background: "#fff8f0",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      width: 176,
                      height: 176,
                      borderRadius: 999,
                      overflow: "hidden",
                      background: BRAND_GRADIENT,
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 72,
                      fontWeight: 800,
                      color: "#fff",
                    }}
                  >
                    {avatarDataUri ? (
                      <img
                        src={avatarDataUri}
                        alt=""
                        width={176}
                        height={176}
                        style={{ objectFit: "cover" }}
                      />
                    ) : (
                      initial
                    )}
                  </div>
                </div>
              </div>
              {rank === 1 && (
                <div
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -6,
                    display: "flex",
                    width: 56,
                    height: 56,
                    borderRadius: 999,
                    background: "#fff",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 6px 16px rgba(0,0,0,0.25)",
                  }}
                >
                  <svg width="28" height="24" viewBox="0 0 24 20" fill="none">
                    <path
                      d="M2 18 3.2 6 8.4 10.4 12 2 15.6 10.4 20.8 6 22 18Z"
                      fill="#f9a13b"
                      stroke="#a3372f"
                      strokeWidth="1"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Headline (gradient text) + subtitle */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginTop: 36,
              textAlign: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 64,
                fontWeight: 800,
                backgroundImage: BRAND_GRADIENT,
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}
            >
              {headline}
            </div>
            <div style={{ display: "flex", marginTop: 10, fontSize: 26, color: "#7a6f68" }}>
              {subtitle}
            </div>
          </div>

          {/* Identity */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginTop: 32,
              gap: 6,
            }}
          >
            <div style={{ display: "flex", fontSize: 38, fontWeight: 800, letterSpacing: 1, color: "#241f1c" }}>
              {primaryName}
            </div>
            <div style={{ display: "flex", fontSize: 26, color: "#7a6f68" }}>{`@${handle}`}</div>
          </div>

          {/* Stat cells: Rank / Bid amount / Bid ID */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              width: "100%",
              marginTop: 40,
              borderRadius: 20,
              border: "2px solid rgba(36,31,28,0.15)",
              overflow: "hidden",
            }}
          >
            {statCells.map((cell, i) => (
              <div
                key={cell.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "22px 8px",
                  gap: 6,
                  borderRight: i < statCells.length - 1 ? "2px solid rgba(36,31,28,0.15)" : "none",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: 17,
                    fontWeight: 700,
                    letterSpacing: 2,
                    color: "#9a8f89",
                    textTransform: "uppercase",
                  }}
                >
                  {cell.label}
                </div>
                <div style={{ display: "flex", fontSize: 28, fontWeight: 800, color: "#241f1c" }}>
                  {cell.value}
                </div>
              </div>
            ))}
          </div>

          {/* Perforated divider */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 20,
              marginTop: 40,
            }}
          >
            {Array.from({ length: 11 }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 999,
                  background: "#241f1c",
                  opacity: 0.35,
                  display: "flex",
                }}
              />
            ))}
          </div>

          {/* Barcode footer */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginTop: "auto",
              gap: 16,
              width: "100%",
            }}
          >
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 24 }}>
              <div style={{ display: "flex", gap: 4 }}>
                {Array.from({ length: 34 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: i % 3 === 0 ? 6 : 3,
                      height: 48,
                      background: "#241f1c",
                      opacity: 0.8,
                      display: "flex",
                    }}
                  />
                ))}
              </div>
              <div style={{ display: "flex", fontSize: 24, fontStyle: "italic", fontWeight: 600, color: "#a3372f" }}>
                Keep bidding!
              </div>
            </div>
            <div style={{ display: "flex", fontSize: 24, color: "#7a6f68" }}>
              {`${category} · ${dateLabel}`}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
