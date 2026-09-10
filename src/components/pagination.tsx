import Link from "next/link";
import { IconChevronLeft, IconChevronRight } from "@/components/icons";
import { cn } from "@/components/ui";

function pageWindow(page: number, totalPages: number): (number | "…")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);
  if (start > 2) out.push("…");
  for (let i = start; i <= end; i++) out.push(i);
  if (end < totalPages - 1) out.push("…");
  out.push(totalPages);
  return out;
}

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  hrefForPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  hrefForPage: (page: number) => string;
}) {
  if (totalPages <= 1) {
    return (
      <p className="text-center text-sm text-muted-foreground tabular-nums">
        {total} listing{total === 1 ? "" : "s"}
      </p>
    );
  }
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav aria-label="Ranking pages" className="mt-2 flex flex-col items-center gap-2">
      <div className="flex items-center gap-2 sm:gap-4">
        {page > 1 ? (
          <Link href={hrefForPage(page - 1)} aria-label="Previous page" className="grid size-8 place-items-center text-primary hover:text-primary/80">
            <IconChevronLeft className="size-5" />
          </Link>
        ) : (
          <span className="grid size-8 place-items-center text-muted-foreground/40">
            <IconChevronLeft className="size-5" />
          </span>
        )}
        {pageWindow(page, totalPages).map((p, i) =>
          p === "…" ? (
            <span key={`gap-${i}`} className="grid size-8 place-items-center text-sm text-muted-foreground">
              …
            </span>
          ) : (
            <Link
              key={p}
              href={hrefForPage(p)}
              aria-current={p === page ? "page" : undefined}
              className={cn(
                "grid h-8 min-w-8 place-items-center rounded-full px-1.5 text-sm font-medium tabular-nums transition-colors",
                p === page ? "bg-primary text-primary-foreground" : "text-primary hover:bg-primary/10",
              )}
            >
              {p}
            </Link>
          ),
        )}
        {page < totalPages ? (
          <Link href={hrefForPage(page + 1)} aria-label="Next page" className="grid size-8 place-items-center text-primary hover:text-primary/80">
            <IconChevronRight className="size-5" />
          </Link>
        ) : (
          <span className="grid size-8 place-items-center text-muted-foreground/40">
            <IconChevronRight className="size-5" />
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground tabular-nums">
        {from} – {to} of {total}
      </p>
    </nav>
  );
}
