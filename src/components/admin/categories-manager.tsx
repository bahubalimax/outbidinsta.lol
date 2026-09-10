"use client";

import { useEffect, useState, useCallback } from "react";

interface Cat {
  id: string;
  name: string;
  slug: string;
  description: string;
  active: boolean;
  sortOrder: number;
  _count?: { listings: number };
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function CategoriesManager() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/categories");
    if (res.ok) {
      const data = await res.json();
      setCats(data.categories);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        slug: slug || slugify(name),
        description,
        active: true,
        sortOrder: cats.length,
      }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d?.error ?? "Failed to add");
      return;
    }
    setName("");
    setSlug("");
    setDescription("");
    load();
  }

  async function patch(id: string, body: Partial<Cat>) {
    setError(null);
    const res = await fetch(`/api/admin/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d?.error ?? "Update failed");
      return;
    }
    load();
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this category? Only works if it has no listings.")) return;
    setError(null);
    const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d?.error ?? "Delete failed");
      return;
    }
    load();
  }

  async function move(index: number, dir: -1 | 1) {
    const next = [...cats];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    setCats(next);
    const res = await fetch("/api/admin/categories/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: next.map((c) => c.id) }),
    });
    if (!res.ok) load();
  }

  return (
    <div className="space-y-5">
      <form onSubmit={add} className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-semibold">Add category</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="h-9 rounded-lg border border-input bg-popover px-3 text-sm"
          />
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder={name ? slugify(name) : "slug"}
            className="h-9 rounded-lg border border-input bg-popover px-3 text-sm"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            className="h-9 rounded-lg border border-input bg-popover px-3 text-sm"
          />
        </div>
        <button className="mt-3 h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
          Add
        </button>
      </form>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      <ul className="space-y-2">
        {cats.map((c, i) => (
          <li
            key={c.id}
            className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3 text-sm"
          >
            <span className="flex flex-col">
              <button onClick={() => move(i, -1)} className="text-xs text-muted-foreground hover:text-foreground">
                ▲
              </button>
              <button onClick={() => move(i, 1)} className="text-xs text-muted-foreground hover:text-foreground">
                ▼
              </button>
            </span>
            <input
              defaultValue={c.name}
              onBlur={(e) => e.target.value !== c.name && patch(c.id, { name: e.target.value })}
              className="h-8 w-32 rounded-lg border border-input bg-popover px-2"
            />
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{c.slug}</code>
            <input
              defaultValue={c.description}
              onBlur={(e) =>
                e.target.value !== c.description && patch(c.id, { description: e.target.value })
              }
              placeholder="description"
              className="h-8 min-w-[10rem] flex-1 rounded-lg border border-input bg-popover px-2"
            />
            <span className="text-xs text-muted-foreground">
              {c._count?.listings ?? 0} listings
            </span>
            <button
              onClick={() => patch(c.id, { active: !c.active })}
              className={`rounded-lg border px-2 py-1 text-xs font-medium ${
                c.active ? "border-success/30 text-success" : "border-border text-muted-foreground"
              }`}
            >
              {c.active ? "active" : "disabled"}
            </button>
            <button
              onClick={() => remove(c.id)}
              className="rounded-lg border border-destructive/30 px-2 py-1 text-xs font-medium text-destructive"
            >
              delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
