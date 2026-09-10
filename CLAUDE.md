# CLAUDE.md — OutBidInsta

Guidance for AI assistants (and humans) working in this repo.

## What this is

**OutBidInsta** — a public, pay-to-rank leaderboard for **Instagram profiles**. Users paste an
`@username`, pick a category, and pay so the profile's **lifetime spend** reaches a target. Rank is
by total confirmed spend. It is independently built; it is **not affiliated with Instagram or
Meta** and every user-facing page says so.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router), React 19, TypeScript (strict) |
| DB / ORM | PostgreSQL + Prisma 6 (Neon in production) |
| Styling | Tailwind CSS v4 (`src/app/globals.css` holds the tokens) |
| Fonts | Poppins (display) + Geist Mono, via `next/font` |
| Payments | Dodo Payments (`dodopayments` SDK) + Standard-Webhooks verification |
| Admin auth | Signed JWT cookie (`jose`), single identity from env |
| Validation | Zod · Rate limiting: in-memory (swap for Redis at scale) |
| Money | Integer minor units everywhere. One module: `src/lib/money.ts` |
| Tests | Vitest (`tests/*.test.ts`, pure functions only — no DB needed) |

## The ranking model (important)

Rank = **cumulative lifetime spend on a listing**, not a single "current bid".

- `Listing.totalCents` = sum of every `CONFIRMED` `Bid.amountCents`.
- A `Bid` is one paid contribution. `amountCents` is what the customer was **charged** (the
  *difference* when topping up an existing listing). `targetTotalCents` is the lifetime total they
  aimed for. `confirmedAt` drives the time-window boards.
- **New listing**: minimum target = `startingBidCents` ($10). Charge = the whole target.
- **Existing listing**: minimum target = `totalCents + minIncrementCents` ($1). Charge =
  `target − totalCents`.
- **Take #1**: costs `leaderTotal + takeTopIncrementCents` ($5) over the current leader.
- **Ties**: the older listing (earlier `createdAt` / earliest window contribution) keeps the higher
  rank.
- **Max** lifetime total: `maxBidCents` ($999,999).

### Three boards
- **All-time** (`/`, `/leaderboard`→redirect): `ORDER BY Listing.totalCents DESC, createdAt ASC`.
- **Today** (`/today`): rolling `todayWindowHours` (24h). `SUM(Bid.amountCents)` per listing where
  `confirmedAt` in the window; rank by that sum.
- **Daily** (`/daily`, `/daily/YYYY-MM-DD`): a UTC calendar day. Same as Today but a fixed
  `[dayStart, dayStart+24h)` window. Current day is live; past days are frozen archives.

All board logic: `src/lib/leaderboard.ts`. Window math: `src/lib/date-windows.ts`.

## Payment flow (never trust the browser)

```
Browser → POST /api/bids  (createBidIntent)
  → resolve/create Listing, validate target, compute charge
  → create PENDING Bid + PENDING Payment
  → Dodo checkoutSessions.create({ product_cart:[{product_id, amount: chargeCents}], customer, metadata, return_url })
  → return { checkoutUrl }
Browser → Dodo hosted checkout → pays
Dodo → POST /api/webhooks/dodo
  → verifyStandardWebhook(secret, rawBody, headers)   [reject invalid → 401]
  → insert WebhookEvent (unique provider+eventId → idempotent)
  → payment.succeeded → confirmBidPayment():
      Serializable txn:
        - mark Payment paid (idempotent)
        - if Bid still PENDING and listing biddable:
            Listing.totalCents += Bid.amountCents   (atomic increment — additive, no CAS needed)
            Bid → CONFIRMED, confirmedAt = now
        - if listing was removed/disabled → Bid → VOID → auto-refund (policy)
  → record ActivityEvent, return 200
Browser → /checkout/return?bid=<id> → polls GET /api/bids/[id] until confirmed
```

The leaderboard changes **only** inside `confirmBidPayment`, i.e. only after a verified webhook.
A frontend "success" is never sufficient. See `src/lib/payments.ts`.

## Business rules — do NOT hard-code

All in the single-row `Settings` table (id = 1), editable at `/admin/settings`, read via
`getSettings()` (10s cache) in `src/lib/settings.ts`:
`startingBidCents`, `minIncrementCents`, `takeTopIncrementCents`, `maxBidCents`, `currency`,
`todayWindowHours`, `dailyBoardEnabled`, `listingsEnabled`, `biddingEnabled`, `autoRefundVoided`.

Categories are database-driven (`Category` table), managed at `/admin/categories`
(create / rename / describe / reorder / disable / delete). Never hard-code the list.

## Important files

| Path | Purpose |
|---|---|
| `prisma/schema.prisma` | All models. `directUrl` used for migrations. |
| `src/lib/bidding.ts` | Pure engine: `minTargetTotalCents`, `validateTarget`, `chargeForTarget`, `claimRankTargetCents`, `assignRanks` |
| `src/lib/leaderboard.ts` | The three boards + `getTopCategories` |
| `src/lib/bids.ts` | `createBidIntent` — build a PENDING bid + Dodo checkout |
| `src/lib/payments.ts` | `confirmBidPayment` + fail/cancel/refund/dispute handlers |
| `src/lib/dodo.ts` | Thin wrapper over the official SDK (documented methods only) |
| `src/lib/webhook-verify.ts` | Standard-Webhooks HMAC verification (no runtime dep) |
| `src/lib/auth.ts` / `auth-token.ts` | Admin session (token module is edge-safe for middleware) |
| `src/lib/money.ts` | The ONLY place currency formatting/parsing lives |
| `src/lib/settings.ts` | Business-rule accessor |
| `src/lib/date-windows.ts` | Today/Daily window helpers |
| `src/middleware.ts` | Protects `/admin` + `/api/admin` (except login) |
| `src/components/board-screen.tsx` | Renders a whole board page; `/`, `/today`, `/daily` are thin wrappers |
| `src/app/api/webhooks/dodo/route.ts` | The verified webhook endpoint |

## Coding conventions

- **Money**: never a float, never a bare `$`. Store/compute integer cents; display via
  `formatMoney(cents, currency)`.
- **`"server-only"`** at the top of any module that must not reach the client bundle
  (`db`, `env`, `auth`, `settings`, `bids`, `payments`, `dodo`, `leaderboard`, `listings`,
  `profile`, `activity`, `admin-actions`).
- API route handlers: `export const runtime = "nodejs"` + `dynamic = "force-dynamic"`; wrap the
  body in `try/catch` and return via `jsonOk` / `jsonError` / `handleApiError`.
- Mutating routes call `assertSameOrigin(req)` (CSRF) and `rateLimit(key, limit, windowMs)`.
- Pages that read the DB set `export const dynamic = "force-dynamic"`.
- Leaderboard rows use the overlay-anchor pattern (`RowLink` absolute `z-0`, content
  `pointer-events-none z-10`, inner links `pointer-events-auto z-20`) — **no nested `<a>`**.
- Client components that use `useSearchParams()` must sit inside a `<Suspense>` boundary
  (see `SiteHeader` and `admin/login`).

## Security rules

- Dodo secret key, webhook secret, `DATABASE_URL`, `AUTH_SECRET`, admin credentials: **env only**,
  never in source, never in the client bundle, never logged.
- Webhook: verify signature + timestamp tolerance, reject invalid, dedupe by `webhook-id`, process
  once, log events, update rank only after verification.
- Admin: middleware + `requireAdmin()` in every admin API handler. Login is rate-limited (5 / 5min).
- Bid amount from the browser is advisory only — the server re-parses and re-validates.

## Commands

```bash
npm run dev            # local dev server
npm run build          # prisma generate + next build
npm run start          # production server
npm run typecheck      # tsc --noEmit
npm run lint           # next lint
npm test               # vitest run  (no DB needed)
npm run prisma:migrate # prisma migrate dev  (local)
npm run prisma:deploy  # prisma migrate deploy  (production / CI)
npm run db:seed        # categories + settings row  (SEED_DEMO=1 adds demo listings)
```

## Deploy notes

- Vercel: framework auto-detected. Set env vars (see `.env.example`). Build command
  `prisma generate && next build` (the `build` script). `prisma migrate deploy` runs against
  `DIRECT_DATABASE_URL` — add it as a Vercel env var or run it once from a shell.
- Neon: use the **pooled** URL for `DATABASE_URL` (add `&pgbouncer=true`) and the **direct** URL
  for `DIRECT_DATABASE_URL`.
- Dodo webhook endpoint: `https://<domain>/api/webhooks/dodo`. Copy its signing secret into
  `DODO_WEBHOOK_SECRET`. Create ONE Dodo product with "Pay what you want" pricing (USD) and put its
  id in `DODO_BID_PRODUCT_ID`.
