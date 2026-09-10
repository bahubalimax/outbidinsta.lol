import { Suspense } from "react";
import { AdminLoginForm } from "@/components/admin/login-form";

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-sm flex-col justify-center px-4">
      <h1 className="text-xl font-semibold">Admin sign in</h1>
      <p className="mt-1 text-sm text-muted-foreground">OutBidInsta dashboard</p>
      <Suspense fallback={<div className="mt-6 h-40 rounded-xl bg-muted" />}>
        <AdminLoginForm />
      </Suspense>
    </div>
  );
}
