import Link from "next/link";
import { cn } from "@/components/ui";

type Board = "all" | "today" | "daily";

const TABS: { key: Board; label: string; href: string }[] = [
  { key: "all", label: "All-time", href: "/" },
  { key: "today", label: "Today", href: "/today" },
  { key: "daily", label: "Daily", href: "/daily" },
];

export function BoardTabs({
  active,
  showDaily = true,
}: {
  active: Board;
  /** Admin setting (Settings.dailyBoardEnabled) — hides the tab without removing the route. */
  showDaily?: boolean;
}) {
  const tabs = showDaily ? TABS : TABS.filter((t) => t.key !== "daily");
  return (
    <div className="flex justify-center">
      <div
        role="tablist"
        aria-label="Ranking board"
        className="inline-flex items-center rounded-full border border-border p-0.5"
      >
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            role="tab"
            aria-selected={active === t.key}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold leading-none tracking-tight transition-colors",
              active === t.key
                ? "brand-gradient-bg text-white"
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
