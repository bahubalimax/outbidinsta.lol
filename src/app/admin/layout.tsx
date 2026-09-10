import type { Metadata } from "next";
import { getAdminSession } from "@/lib/auth";
import { AdminShell } from "@/components/admin/admin-shell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  // Middleware protects every /admin route except /admin/login. When there is no
  // session we are therefore on the login page — render it without the shell.
  if (!session) return <>{children}</>;
  return <AdminShell email={session.email}>{children}</AdminShell>;
}
