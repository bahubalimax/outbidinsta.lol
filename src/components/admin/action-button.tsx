"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/components/ui";

export function ActionButton({
  url,
  body,
  method = "POST",
  label,
  confirm,
  tone = "default",
  className,
}: {
  url: string;
  body?: unknown;
  method?: "POST" | "PATCH" | "DELETE";
  label: string;
  confirm?: string;
  tone?: "default" | "danger" | "primary";
  className?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run() {
    if (confirm && !window.confirm(confirm)) return;
    setError(null);
    start(async () => {
      try {
        const res = await fetch(url, {
          method,
          headers: body ? { "Content-Type": "application/json" } : undefined,
          body: body ? JSON.stringify(body) : undefined,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data?.error ?? `Failed (${res.status})`);
          return;
        }
        router.refresh();
      } catch {
        setError("Network error");
      }
    });
  }

  return (
    <span className="inline-flex flex-col items-start">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className={cn(
          "rounded-lg border px-2.5 py-1 text-xs font-medium disabled:opacity-50",
          tone === "danger"
            ? "border-destructive/30 text-destructive hover:bg-destructive/10"
            : tone === "primary"
              ? "border-primary bg-primary text-primary-foreground hover:opacity-90"
              : "border-border hover:bg-muted",
          className,
        )}
      >
        {pending ? "…" : label}
      </button>
      {error && <span className="mt-0.5 text-[11px] text-destructive">{error}</span>}
    </span>
  );
}
