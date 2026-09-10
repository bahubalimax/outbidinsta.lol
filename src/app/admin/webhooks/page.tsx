import Link from "next/link";
import { prisma } from "@/lib/db";
import { timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminWebhooks({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const filter = sp.filter === "unprocessed" || sp.filter === "errors" ? sp.filter : "all";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const pageSize = 50;

  const where =
    filter === "unprocessed"
      ? { processed: false }
      : filter === "errors"
        ? { error: { not: null } }
        : {};

  const [total, events] = await Promise.all([
    prisma.webhookEvent.count({ where }),
    prisma.webhookEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Webhook events ({total})</h1>
      <div className="flex gap-1.5">
        {["all", "unprocessed", "errors"].map((f) => (
          <Link
            key={f}
            href={`/admin/webhooks${f === "all" ? "" : `?filter=${f}`}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              filter === f ? "border-primary bg-primary text-primary-foreground" : "border-border"
            }`}
          >
            {f}
          </Link>
        ))}
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-muted text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Event id</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Processed</th>
              <th className="px-3 py-2">Error</th>
              <th className="px-3 py-2">Received</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {events.map((e) => (
              <tr key={e.id}>
                <td className="px-3 py-2 font-mono text-[11px]">{e.eventId}</td>
                <td className="px-3 py-2">{e.eventType}</td>
                <td className="px-3 py-2">
                  {e.processed ? (
                    <span className="text-success">yes</span>
                  ) : (
                    <span className="text-warning">no</span>
                  )}
                </td>
                <td className="px-3 py-2 max-w-[16rem] truncate text-xs text-destructive">
                  {e.error ?? ""}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{timeAgo(e.createdAt)}</td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                  No events.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
