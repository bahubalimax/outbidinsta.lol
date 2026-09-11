import { ImageResponse } from "next/og";
import { getProfileView } from "@/lib/profile";
import { formatMoney } from "@/lib/money";
import { SITE_NAME } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WIDTH = 1080;
const HEIGHT = 1350;

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
  const lifetime = view ? formatMoney(view.lifetimeTotalCents, view.currency) : "$0";
  const initial = handle.replace(/[^a-z0-9]/gi, "").slice(0, 1).toUpperCase() || "?";
  const headline = rank === 1 ? "You're #1" : rank ? `Rank #${rank} claimed` : "On the board";
  const dateLabel = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

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
            padding: "72px 64px",
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

          {/* Logo mark */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>
            <svg width="72" height="64" viewBox="0 0 36 32" fill="none">
              <rect x="22" y="0" width="14" height="6" rx="3" fill="#f9a13b" />
              <rect x="12" y="11" width="24" height="6" rx="3" fill="#e1306c" />
              <rect x="0" y="22" width="36" height="6" rx="3" fill="#6a3df5" />
            </svg>
            <div
              style={{
                display: "flex",
                fontSize: 30,
                fontWeight: 700,
                letterSpacing: 2,
                color: "#a3372f",
                textTransform: "uppercase",
              }}
            >
              {SITE_NAME}
            </div>
          </div>

          {/* Headline */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginTop: 48,
              textAlign: "center",
            }}
          >
            <div style={{ display: "flex", fontSize: 76, fontWeight: 800, color: "#241f1c" }}>
              {headline}
            </div>
            <div style={{ display: "flex", marginTop: 16, fontSize: 34, color: "#7a6f68" }}>
              {`${category} · ${dateLabel}`}
            </div>
          </div>

          {/* Perforated divider */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 20,
              marginTop: 100,
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

          {/* Identity */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginTop: 100,
              gap: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                width: 96,
                height: 96,
                borderRadius: 24,
                background: "linear-gradient(135deg, #6a3df5, #e1306c 55%, #f9a13b)",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 44,
                fontWeight: 800,
                color: "#fff",
              }}
            >
              {initial}
            </div>
            <div style={{ display: "flex", fontSize: 46, fontWeight: 700, letterSpacing: 2, color: "#241f1c" }}>
              {`@${handle}`.toUpperCase()}
            </div>
            <div style={{ display: "flex", fontSize: 30, color: "#7a6f68" }}>
              {`Lifetime spend: ${lifetime}`}
            </div>
          </div>

          {/* Barcode footer */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "auto", gap: 20 }}>
            <div style={{ display: "flex", gap: 4 }}>
              {Array.from({ length: 40 }).map((_, i) => (
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
            <div style={{ display: "flex", fontSize: 26, color: "#a3372f", fontWeight: 600 }}>
              outbidinsta.lol
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
