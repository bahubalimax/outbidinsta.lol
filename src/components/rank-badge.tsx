"use client";

import { useState } from "react";
import { cn } from "@/components/ui";

export function RankBadge({ rank, className }: { rank: number; className?: string }) {
  const tone =
    rank === 1
      ? "bg-amber-400/15 text-amber-600 border-amber-400/40 dark:text-amber-300"
      : rank === 2
        ? "bg-slate-400/15 text-slate-600 border-slate-400/40 dark:text-slate-300"
        : rank === 3
          ? "bg-orange-500/15 text-orange-600 border-orange-500/40 dark:text-orange-300"
          : "bg-muted text-muted-foreground border-border";
  return (
    <span
      className={cn(
        "inline-grid h-8 min-w-8 place-items-center rounded-lg border px-1.5 text-sm font-bold tabular-nums",
        tone,
        className,
      )}
      aria-label={`Rank ${rank}`}
    >
      #{rank}
    </span>
  );
}

export function Avatar({
  username,
  src,
  size = 40,
}: {
  username: string;
  src?: string | null;
  size?: number;
}) {
  const [broken, setBroken] = useState(false);
  const initial = username.replace(/[^a-z0-9]/gi, "").slice(0, 1).toUpperCase() || "?";
  if (src && !broken) {
    return (
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        onError={() => setBroken(true)}
        className="rounded-full border border-border object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full obi-gradient-bg font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      aria-hidden
    >
      {initial}
    </span>
  );
}
