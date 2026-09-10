import { ImageResponse } from "next/og";
import { getProfileView } from "@/lib/profile";
import { formatMoney } from "@/lib/money";
import { SITE_NAME } from "@/lib/site";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "OutBidInsta profile";

export default async function Image({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  let view = null;
  try {
    view = await getProfileView(username);
  } catch {
    view = null;
  }

  const handle = view?.username ?? username.toLowerCase();
  const rank = view?.globalRank ? `#${view.globalRank}` : "—";
  const current = view ? formatMoney(view.lifetimeTotalCents, view.currency) : "$0";
  const next = view ? formatMoney(view.minNextTargetCents, view.currency) : "$10";
  const category = view?.category.name ?? "Instagram";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#fffdfa",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, color: "#67625d", fontSize: 30 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "#e5674f",
              display: "flex",
            }}
          />
          <span style={{ color: "#282624", fontWeight: 700 }}>
            OutBid<span style={{ color: "#e5674f" }}>Insta</span>
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 40, color: "#67625d" }}>
            {rank} on {SITE_NAME} · {category}
          </div>
          <div style={{ fontSize: 96, fontWeight: 800, color: "#282624" }}>@{handle}</div>
          <div style={{ fontSize: 44, color: "#67625d" }}>
            Lifetime <span style={{ color: "#282624", fontWeight: 700 }}>{current}</span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignSelf: "flex-start",
            background: "#e5674f",
            color: "#fff",
            fontSize: 40,
            fontWeight: 700,
            padding: "16px 32px",
            borderRadius: 999,
          }}
        >
          Outbid for {next}
        </div>
      </div>
    ),
    size,
  );
}
