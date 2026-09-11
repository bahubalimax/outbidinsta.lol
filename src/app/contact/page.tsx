import type { Metadata } from "next";
import { Prose } from "@/components/prose";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  alternates: { canonical: "/contact" },
};

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@outbidinsta.lol";

export default function ContactPage() {
  return (
    <Prose title="Contact">
      <p>
        For support, refund reviews, listing removal requests, category changes, or press: email{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> or DM{" "}
        <a href="https://instagram.com/outbidinsta.lol" target="_blank" rel="noopener noreferrer">
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
    </Prose>
  );
}
