"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/components/ui";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/listings", label: "Listings" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/bids", label: "Bids" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/webhooks", label: "Webhook Events" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl gap-6 px-4 py-6">
      <aside className="hidden w-52 shrink-0 md:block">
        <div className="sticky top-6 space-y-1">
          <p className="px-3 pb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            OutBidInsta admin
          </p>
          {NAV.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block rounded-lg px-3 py-2 text-sm font-medium",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={logout}
            className="mt-2 block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Sign out
          </button>
          <p className="px-3 pt-2 text-[11px] break-all text-muted-foreground">{email}</p>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <nav className="mb-4 flex gap-1.5 overflow-x-auto md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-medium whitespace-nowrap"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {children}
      </div>
    </div>
  );
}
