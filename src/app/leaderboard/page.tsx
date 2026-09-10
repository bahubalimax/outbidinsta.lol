import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LeaderboardRedirect({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; category?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  if (sp.category) params.set("category", sp.category);
  if (sp.page && sp.page !== "1") params.set("page", sp.page);
  const qs = params.toString();
  const base = sp.scope === "today" ? "/today" : "/";
  redirect(`${base}${qs ? `?${qs}` : ""}`);
}
