"use client";

import { useState } from "react";
import { SITE_URL } from "@/lib/site";
import { IconX, IconLinkedIn, IconReddit, IconInstagram, IconDownload, IconLink } from "@/components/icons";

/**
 * The shareable "ticket" card shown after a bid confirms, and on the profile
 * page. The image itself is generated server-side (src/app/api/og/ticket) —
 * this component just previews it and wires up sharing. Rendered inline on
 * both host pages (never as an overlay), so there's no dismiss/close control.
 */
export function ShareTicket({ username, text }: { username: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const [igBusy, setIgBusy] = useState(false);
  const [igHint, setIgHint] = useState(false);

  const ticketUrl = `${SITE_URL}/api/og/ticket/${encodeURIComponent(username)}`;
  const profileUrl = `${SITE_URL}/profile/${encodeURIComponent(username)}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  async function shareToInstagram() {
    setIgBusy(true);
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        // Instagram has no web share-intent URL — the closest thing to
        // "posting to Instagram" is handing the OS share sheet the actual
        // image file, which is what navigator.share with files does.
        const res = await fetch(ticketUrl);
        const blob = await res.blob();
        const file = new File([blob], "outbidinsta-ticket.png", { type: "image/png" });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: "OutBidInsta", text });
          return;
        }
      }
    } catch {
      // User cancelled the native share sheet, or the fetch/share failed —
      // fall through to the manual-save path below.
    } finally {
      setIgBusy(false);
    }
    window.open(ticketUrl, "_blank", "noopener,noreferrer");
    setIgHint(true);
    setTimeout(() => setIgHint(false), 6000);
  }

  const intents: { label: string; href: string; Icon: typeof IconX; bg: string }[] = [
    {
      label: "X",
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(profileUrl)}`,
      Icon: IconX,
      bg: "#000000",
    },
    {
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}`,
      Icon: IconLinkedIn,
      bg: "#0A66C2",
    },
    {
      label: "Reddit",
      href: `https://www.reddit.com/submit?url=${encodeURIComponent(profileUrl)}&title=${encodeURIComponent(text)}`,
      Icon: IconReddit,
      bg: "#FF4500",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="text-center">
          <h3 className="text-lg font-semibold">Share Your Achievement</h3>
          <p className="mt-1 text-sm text-muted-foreground">Show the world you&apos;re a top bidder!</p>
        </div>

        <div className="mx-auto mt-4 w-full max-w-[240px] overflow-hidden rounded-2xl shadow-lg">
          <img src={ticketUrl} alt={`${username}'s OutBidInsta ticket`} className="block w-full" />
        </div>

        <a
          href={ticketUrl}
          download={`outbidinsta-${username}.png`}
          className="brand-gradient-bg mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
        >
          <IconDownload className="size-4" />
          Download Image
        </a>

        <div className="mt-5 grid grid-cols-4 gap-2">
          {intents.map(({ label, href, Icon, bg }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5"
            >
              <span
                className="flex size-11 items-center justify-center rounded-full text-white shadow-sm transition-transform hover:scale-105"
                style={{ background: bg }}
              >
                <Icon className="size-5" />
              </span>
              <span className="text-xs text-muted-foreground">{label}</span>
            </a>
          ))}
          <button
            type="button"
            onClick={shareToInstagram}
            disabled={igBusy}
            className="flex flex-col items-center gap-1.5 disabled:opacity-60"
          >
            <span className="brand-gradient-bg flex size-11 items-center justify-center rounded-full text-white shadow-sm transition-transform hover:scale-105">
              <IconInstagram className="size-5" />
            </span>
            <span className="text-xs text-muted-foreground">Instagram</span>
          </button>
        </div>

        {igHint && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Opened your ticket in a new tab — save the image, then post it to Instagram.
          </p>
        )}

        <button
          type="button"
          onClick={copyLink}
          className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-border text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <IconLink className="size-4" />
          {copied ? "Link copied!" : "Copy Link"}
        </button>
      </div>
    </div>
  );
}
