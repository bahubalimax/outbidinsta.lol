import Link from "next/link";
import { cn } from "@/components/ui";

type Board = "all" | "today" | "daily";

const TABS: { key: Board; label: string; href: string }[] = [
  { key: "all", label: "All-time", href: "/" },
  { key: "today", label: "Today", href: "/today" },
  { key: "daily", label: "Daily", href: "/daily" },
];

export function BoardTabs({ active }: { active: Board }) {
  return (
    <div className="flex justify-center">
      <div
        role="tablist"
        aria-label="Ranking board"
        className="inline-flex items-center rounded-full border border-border p-0.5"
      >
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            role="tab"
            aria-selected={active === t.key}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold leading-none tracking-tight transition-colors",
              active === t.key
                ? "bg-primary text-primary-foreground"
                : "text-primary hover:bg-background/70 hover:text-primary/80",
            )}
          >
            {t.key !== "all" && (
              <span className="relative inline-flex size-2 shrink-0" aria-hidden>
                <span className="obi-ping absolute inline-flex size-full rounded-full bg-current opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-current" />
              </span>
            )}
            {t.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
