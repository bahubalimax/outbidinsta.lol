"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/components/ui";
import { IconGrid, IconTag } from "@/components/icons";

export function CategoryStrip({
  categories,
}: {
  categories: { name: string; slug: string }[];
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const activeSlug =
    pathname.startsWith("/category/") ? pathname.split("/")[2] : params.get("category") ?? "";
  const allActive = (pathname === "/" || pathname === "/leaderboard") && !activeSlug;

  return (
    <div className="relative z-20 overflow-hidden rounded-full bg-muted px-3 py-1.5">
      <div className="flex items-center gap-1">
        <nav aria-label="Categories" className="obi-scroll-x min-w-0 flex-1 overflow-x-auto">
          <div className="flex w-max min-w-full items-center gap-0.5">
            <PillLink href="/" active={allActive} icon={<IconGrid className="size-3.5" />}>
              All
            </PillLink>
            {categories.map((c) => (
              <PillLink
                key={c.slug}
                href={`/category/${c.slug}`}
                active={activeSlug === c.slug}
                icon={<IconTag className="size-3.5" />}
              >
                {c.name}
              </PillLink>
            ))}
          </div>
        </nav>
        <Link
          href="/categories"
          className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-[0.8rem] font-semibold text-primary hover:bg-background/70"
        >
          <IconGrid className="size-3.5" />
          Explore
        </Link>
      </div>
    </div>
  );
}

function PillLink({
  href,
  active,
  icon,
  children,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-[0.8rem] font-semibold whitespace-nowrap transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-background/70 hover:text-foreground",
      )}
    >
      <span className={active ? "text-primary-foreground/85" : "text-primary/70"}>{icon}</span>
      {children}
    </Link>
  );
}
