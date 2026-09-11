"use client";

import { useRef, useState } from "react";

const MAX_DIMENSION = 320;
const JPEG_QUALITY = 0.82;

/** Downscale + compress in the browser so we never ship a multi-MB photo to the server. */
function resizeToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas unavailable"));
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

export function AvatarUpload({ bidId, onUploaded }: { bidId: string; onUploaded?: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file.");
      setStatus("error");
      return;
    }

    setStatus("uploading");
    setError(null);
    try {
      const dataUri = await resizeToDataUri(file);
      setPreview(dataUri);
      const res = await fetch(`/api/bids/${encodeURIComponent(bidId)}/avatar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: dataUri }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Upload failed");
      }
      setStatus("done");
      onUploaded?.();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  }

  if (status === "done") {
    return (
      <div className="flex items-center justify-center gap-2.5 text-sm text-muted-foreground">
        {preview && (
          <img src={preview} alt="" className="size-8 rounded-full border border-border object-cover" />
        )}
        Photo added — it&apos;ll show on your ticket and leaderboard row.
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onFile}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={status === "uploading"}
        className="inline-flex h-10 items-center gap-2 rounded-full border border-input px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
      >
        {preview && (
          <img src={preview} alt="" className="size-5 rounded-full object-cover" />
        )}
        {status === "uploading" ? "Uploading…" : "Add a photo"}
      </button>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">Optional — shown on your ticket &amp; leaderboard row.</p>
    </div>
  );
}
