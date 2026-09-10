"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function ChangeCategoryForm({
  listingId,
  categories,
  current,
}: {
  listingId: string;
  categories: { id: string; name: string }[];
  current: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(current);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save() {
    if (value === current) return;
    setError(null);
    start(async () => {
      const res = await fetch(`/api/admin/listings/${listingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: value }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d?.error ?? "Failed");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex gap-2">
        <select
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-9 rounded-lg border border-input bg-popover px-2 text-sm"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={save}
          disabled={pending || value === current}
          className="h-9 rounded-lg border border-border px-3 text-xs font-medium disabled:opacity-50"
        >
          {pending ? "…" : "Move"}
        </button>
      </div>
      {error && <p className="mt-1 text-[11px] text-destructive">{error}</p>}
    </div>
  );
}
