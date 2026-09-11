"use client";

import { useState } from "react";
import { SITE_URL } from "@/lib/site";

/**
 * The shareable "ticket" card shown after a bid confirms, and on the profile
 * page. The image itself is generated server-side (src/app/api/og/ticket) —
 * this component just previews it and wires up sharing.
 */
export function ShareTicket({ username, text }: { username: string; text: string }) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const ticketUrl = `${SITE_URL}/api/og/ticket/${encodeURIComponent(username)}`;
  const profileUrl = `${SITE_URL}/profile/${encodeURIComponent(username)}`;

  async function nativeShare() {
    setBusy(true);
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        // Try sharing the actual ticket image (mobile browsers surface every
        // installed app — Instagram, WhatsApp, etc. — as a target for this).
        try {
          const res = await fetch(ticketUrl);
          const blob = await res.blob();
          const file = new File([blob], "outbidinsta-ticket.png", { type: "image/png" });
          if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({ files: [file], title: "OutBidInsta", text });
            return;
          }
        } catch {
          /* fall through to link share */
        }
        await navigator.share({ title: "OutBidInsta", text, url: profileUrl });
        return;
      }
    } catch {
      /* user cancelled — fall through to copy */
    } finally {
      setBusy(false);
    }
    try {
      await navigator.clipboard.writeText(`${text} ${profileUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  const intents = [
    {
      label: "X",
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(profileUrl)}`,
    },
    {
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}`,
    },
    {
      label: "Reddit",
      href: `https://www.reddit.com/submit?url=${encodeURIComponent(profileUrl)}&title=${encodeURIComponent(text)}`,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-xs">
      <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ticketUrl} alt={`${username}'s OutBidInsta ticket`} className="block w-full" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={nativeShare}
          disabled={busy}
          className="brand-gradient-bg col-span-2 inline-flex h-11 items-center justify-center rounded-full text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {copied ? "Copied!" : busy ? "Sharing…" : "Share your ticket"}
        </button>
        {intents.map((intent) => (
          <a
            key={intent.label}
            href={intent.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center justify-center rounded-full border border-border text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            {intent.label}
          </a>
        ))}
        <a
          href={ticketUrl}
          download={`outbidinsta-${username}.png`}
          className="inline-flex h-10 items-center justify-center rounded-full border border-border text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Download
        </a>
      </div>
    </div>
  );
}
