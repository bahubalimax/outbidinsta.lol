import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProfileView } from "@/lib/profile";
import { formatMoney } from "@/lib/money";
import { timeAgo, ordinal } from "@/lib/format";
import { LeaderboardAvatar as Avatar } from "@/components/leaderboard-list";
import { RankBadge } from "@/components/rank-badge";
import { OutbidWidget } from "@/components/outbid-widget";
import { ShareButton } from "@/components/share-button";
import { Card, Badge } from "@/components/ui";
import { IconExternal } from "@/components/icons";
import { absoluteUrl, SITE_NAME, AFFILIATION_DISCLAIMER } from "@/lib/site";
import { tryNormalizeInstagram } from "@/lib/instagram";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const view = await getProfileView(username);
  if (!view) return { title: "Profile not found" };

  const rankText = view.globalRank ? `#${view.globalRank} on ${SITE_NAME}` : `Listed on ${SITE_NAME}`;
  const title = `@${view.username} — ${rankText}`;
  const description = view.globalRank
    ? `@${view.username} is ${ordinal(view.globalRank)} overall (${ordinal(
        view.categoryRank ?? 0,
      )} in ${view.category.name}) with ${formatMoney(
        view.lifetimeTotalCents,
        view.currency,
      )} in lifetime bids. Outbid from ${formatMoney(view.minNextTargetCents, view.currency)}.`
    : `@${view.username} is on the ${view.category.name} board. Claim #1 from ${formatMoney(
        view.minNextTargetCents,
        view.currency,
      )}.`;

  return {
    title,
    description,
    alternates: { canonical: `/profile/${view.username}` },
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/profile/${view.username}`),
      type: "profile",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const view = await getProfileView(username);
  if (!view) {
    const normalized = tryNormalizeInstagram(username);
    if (normalized) return <UnclaimedProfile username={normalized.username} />;
    notFound();
  }

  const shareText =
    view.globalRank === 1
      ? `I'm currently #1 on ${SITE_NAME} 🔥 Can you outbid me?`
      : `@${view.username} is #${view.globalRank ?? "—"} on ${SITE_NAME}. Outbid to take the top spot.`;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-4 pb-16">
      <nav className="text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Leaderboard
        </Link>{" "}
        /{" "}
        <Link href={`/category/${view.category.slug}`} className="hover:text-foreground">
          {view.category.name}
        </Link>{" "}
        / <span className="text-foreground">@{view.username}</span>
      </nav>

      <div className="mt-4 flex items-start gap-4">
        <Avatar username={view.username} src={view.avatarUrl} className="size-16 !rounded-2xl" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">@{view.username}</h1>
            {view.globalRank && <RankBadge rank={view.globalRank} />}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {view.categoryRank ? `#${view.categoryRank} in ${view.category.name}` : view.category.name}
            {" · "}
            <a
              href={view.instagramUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex items-center gap-0.5 text-primary hover:underline"
            >
              View on Instagram <IconExternal className="size-3" />
            </a>
          </p>
          {view.status !== "ACTIVE" && (
            <div className="mt-2">
              <Badge>
                {view.status === "PENDING" ? "Awaiting first confirmed bid" : view.status}
              </Badge>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">Lifetime (all-time)</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {formatMoney(view.lifetimeTotalCents, view.currency)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {view.bidCount} confirmed bid{view.bidCount === 1 ? "" : "s"}
            {view.lastBidAt ? ` · last ${timeAgo(view.lastBidAt)}` : ""}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">Last 24h · today</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {formatMoney(view.todaySpendCents, view.currency)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            this UTC day {formatMoney(view.dailySpendCents, view.currency)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">To raise your rank</p>
          <p className="mt-1 text-2xl font-semibold text-primary tabular-nums">
            {formatMoney(view.minNextTargetCents, view.currency)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Minimum next lifetime total</p>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
        <OutbidWidget
          listingId={view.listingId}
          lifetimeTotalCents={view.lifetimeTotalCents}
          minNextTargetCents={view.minNextTargetCents}
          minIncrementCents={view.minIncrementCents}
          currency={view.currency}
          biddable={view.biddable}
        />
        <div className="flex gap-2 sm:flex-col">
          <ShareButton url={absoluteUrl(`/profile/${view.username}`)} text={shareText} />
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Bid history</h2>
        {view.history.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No confirmed bids yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {view.history.map((b) => (
              <li key={b.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="tabular-nums">
                  <span className="font-semibold">+{formatMoney(b.amountCents, b.currency)}</span>
                  <span className="ml-2 text-muted-foreground">
                    → {formatMoney(b.targetTotalCents, b.currency)} total
                  </span>
                </span>
                <time
                  className="text-xs text-muted-foreground"
                  dateTime={b.confirmedAt ?? b.createdAt}
                >
                  {timeAgo(b.confirmedAt ?? b.createdAt)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-8 text-xs text-muted-foreground">{AFFILIATION_DISCLAIMER}</p>
    </div>
  );
}

function UnclaimedProfile({ username }: { username: string }) {
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-16 text-center">
      <Avatar username={username} className="mx-auto size-16 !rounded-2xl" />
      <h1 className="mt-4 text-2xl font-semibold">@{username}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This Instagram profile isn&apos;t on the leaderboard yet.
      </p>
      <Link
        href={`/?claim=${encodeURIComponent(username)}#claim`}
        className="mt-6 inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
      >
        Claim @{username}
      </Link>
    </div>
  );
}
