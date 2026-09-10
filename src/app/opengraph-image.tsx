import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`;

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 20,
          padding: 80,
          background: "#fffdfa",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 34, color: "#67625d" }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "#e5674f", display: "flex" }} />
          <div style={{ display: "flex", color: "#282624", fontWeight: 700 }}>
            <span>OutBid</span>
            <span style={{ color: "#e5674f" }}>Insta</span>
          </div>
        </div>
        <div style={{ fontSize: 88, fontWeight: 800, color: "#282624", lineHeight: 1.05 }}>
          Outbid Instagram profiles
        </div>
        <div style={{ fontSize: 40, color: "#67625d", maxWidth: 900 }}>
          Put your Instagram profile on the leaderboard. The highest confirmed paid bid takes #1.
        </div>
      </div>
    ),
    size,
  );
}
