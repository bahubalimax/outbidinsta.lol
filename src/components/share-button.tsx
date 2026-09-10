"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

export function ShareButton({
  url,
  text,
}: {
  url: string;
  text: string;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const shareData = { title: "OutBidInsta", text, url };
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        /* user cancelled — fall through to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <Button type="button" variant="outline" onClick={share}>
      {copied ? "Copied!" : "Share"}
    </Button>
  );
}
