import type { Metadata } from "next";
import QRCode from "qrcode";
import { Prose } from "@/components/prose";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  alternates: { canonical: "/contact" },
};

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@outbidinsta.lol";
const INSTAGRAM_URL = "https://instagram.com/outbidinsta.lol";

export default async function ContactPage() {
  const qrSvg = await QRCode.toString(INSTAGRAM_URL, {
    type: "svg",
    margin: 1,
    // Solid white background regardless of site theme — a QR code's
    // scannability depends on high contrast, not on matching dark mode.
    color: { dark: "#000000", light: "#ffffff" },
  });

  return (
    <Prose title="Contact">
      <p>
        For support, refund reviews, listing removal requests, category changes, or press: email{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> or DM{" "}
        <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
          @outbidinsta.lol
        </a>{" "}
        on Instagram.
      </p>
      <h2>Please include</h2>
      <ul>
        <li>The email address you used at checkout</li>
        <li>The Instagram @handle involved</li>
        <li>What you&apos;d like us to do</li>
      </ul>
      <p>
        If you are the owner of an Instagram profile and want its {SITE_NAME} listing removed, say so
        and we will take it down.
      </p>

      <div className="mt-2 flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 text-center">
        <div
          className="size-40 rounded-xl bg-white p-3 [&_svg]:size-full"
          // Generated server-side from a hardcoded constant, not user input.
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />
        <div>
          <p className="text-sm font-semibold text-foreground">Scan to follow @outbidinsta.lol</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Or DM us there anytime</p>
        </div>
      </div>
    </Prose>
  );
}
