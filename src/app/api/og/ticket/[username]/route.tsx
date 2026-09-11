import { ImageResponse } from "next/og";
import { getProfileView } from "@/lib/profile";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/db";
import { fetchInstagramAvatarUrl, toAvatarDataUri } from "@/lib/instagram-avatar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WIDTH = 1080;
const HEIGHT = 1350;
const CARD_WIDTH = 880;
const CARD_HEIGHT = 1150;
const CARD_LEFT = (WIDTH - CARD_WIDTH) / 2;
const CARD_TOP = (HEIGHT - CARD_HEIGHT) / 2;
const BRAND_GRADIENT = "linear-gradient(135deg, #6a3df5 0%, #e1306c 55%, #f9a13b 100%)";

/** Evenly-spaced x offsets (within the card) for the scalloped edge notches. */
const SCALLOP_SIZE = 34;
const SCALLOP_COUNT = 14;
const SCALLOP_INSET = 44;
const SCALLOP_X = Array.from({ length: SCALLOP_COUNT }, (_, i) =>
  SCALLOP_INSET + ((CARD_WIDTH - SCALLOP_INSET * 2) / (SCALLOP_COUNT - 1)) * i,
);

/** Decorative confetti scattered in the dark margin around the ticket card. */
const CONFETTI: { top: number; left: number; w: number; h: number; color: string; rot: number; round?: boolean }[] = [
  { top: 35, left: 55, w: 26, h: 42, color: "#e1306c", rot: -18 },
  { top: 100, left: 135, w: 16, h: 16, color: "#f9a13b", rot: 0, round: true },
  { top: 25, left: 940, w: 22, h: 36, color: "#6a3df5", rot: 22 },
  { top: 620, left: 18, w: 30, h: 30, color: "#f9a13b", rot: -10, round: true },
  { top: 700, left: 1015, w: 24, h: 40, color: "#e1306c", rot: 25 },
  { top: 1230, left: 75, w: 18, h: 18, color: "#6a3df5", rot: 0, round: true },
  { top: 1260, left: 955, w: 26, h: 38, color: "#f9a13b", rot: -15 },
  { top: 480, left: 1020, w: 14, h: 14, color: "#e1306c", rot: 0, round: true },
];

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
  const currency = view?.currency ?? "USD";
  const initial = handle.replace(/[^a-z0-9]/gi, "").slice(0, 1).toUpperCase() || "?";

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
          background: "linear-gradient(160deg, #1d1830 0%, #17141d 55%, #1a1119 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {CONFETTI.map((c, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              display: "flex",
              top: c.top,
              left: c.left,
              width: c.w,
              height: c.h,
              borderRadius: c.round ? 999 : 6,
              background: c.color,
              transform: `rotate(${c.rot}deg)`,
              opacity: 0.9,
            }}
          />
        ))}

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
            borderRadius: 48,
            padding: "56px 64px",
            background: "linear-gradient(160deg, #f2e7ff 0%, #ffe1ee 45%, #fff2df 100%)",
            boxShadow: "0 40px 100px rgba(0,0,0,0.5)",
            overflow: "hidden",
          }}
        >
          {/* Diagonal sheen */}
          <div
            style={{
              position: "absolute",
              top: -200,
              left: -100,
              width: 500,
              height: 1550,
              background: "linear-gradient(100deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 60%)",
              transform: "rotate(12deg)",
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
                <defs>
                  <linearGradient id="obiLogoGrad" x1="0" y1="32" x2="36" y2="0" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#6a3df5" />
                    <stop offset="55%" stopColor="#e1306c" />
                    <stop offset="100%" stopColor="#f9a13b" />
                  </linearGradient>
                </defs>
                <rect x="22" y="0" width="14" height="6" rx="3" fill="#f9a13b" />
                <rect x="12" y="11" width="24" height="6" rx="3" fill="#e1306c" />
                <rect x="0" y="22" width="36" height="6" rx="3" fill="url(#obiLogoGrad)" />
              </svg>
              <div style={{ display: "flex", fontSize: 26, fontWeight: 700 }}>
                <span style={{ display: "flex", color: "#241f1c" }}>outbid</span>
                <span
                  style={{
                    display: "flex",
                    backgroundImage: BRAND_GRADIENT,
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  insta
                </span>
                <span style={{ display: "flex", color: "#9a8f89" }}>.lol</span>
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
                  padding: 6,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    width: "100%",
                    height: "100%",
                    borderRadius: 999,
                    overflow: "hidden",
                    background: BRAND_GRADIENT,
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 72,
                    fontWeight: 800,
                    color: "#fff",
                    border: "4px solid #fff8f0",
                  }}
                >
                  {avatarDataUri ? (
                    <img
                      src={avatarDataUri}
                      alt=""
                      width={196}
                      height={196}
                      style={{ objectFit: "cover" }}
                    />
                  ) : (
                    initial
                  )}
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
            <div style={{ display: "flex", marginTop: 18, width: 160, height: 3, borderRadius: 999, background: "rgba(36,31,28,0.15)" }} />
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
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              marginTop: "auto",
              gap: 24,
              width: "100%",
            }}
          >
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
            <div
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                fontSize: 24,
                fontStyle: "italic",
                fontWeight: 600,
                lineHeight: 1.15,
                color: "#a3372f",
                textAlign: "center",
              }}
            >
              <span style={{ display: "flex" }}>Keep</span>
              <span style={{ display: "flex" }}>Building!</span>
              <div
                style={{
                  position: "absolute",
                  bottom: -8,
                  right: 4,
                  display: "flex",
                  width: 60,
                  height: 3,
                  borderRadius: 999,
                  background: "#6a3df5",
                  transform: "rotate(-4deg)",
                }}
              />
            </div>
          </div>
        </div>

        {/* Scalloped perforated edge along the card's top and bottom */}
        {SCALLOP_X.map((x, i) => (
          <div
            key={`t${i}`}
            style={{
              position: "absolute",
              display: "flex",
              left: CARD_LEFT + x - SCALLOP_SIZE / 2,
              top: CARD_TOP - SCALLOP_SIZE / 2,
              width: SCALLOP_SIZE,
              height: SCALLOP_SIZE,
              borderRadius: 999,
              background: "#18131d",
            }}
          />
        ))}
        {SCALLOP_X.map((x, i) => (
          <div
            key={`b${i}`}
            style={{
              position: "absolute",
              display: "flex",
              left: CARD_LEFT + x - SCALLOP_SIZE / 2,
              top: CARD_TOP + CARD_HEIGHT - SCALLOP_SIZE / 2,
              width: SCALLOP_SIZE,
              height: SCALLOP_SIZE,
              borderRadius: 999,
              background: "#18131d",
            }}
          />
        ))}
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
