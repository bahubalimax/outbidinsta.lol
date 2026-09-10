# OutBidInsta — Architecture & HLD

A high-level design of the platform, the request paths, and how it holds up under
traffic. For conventions and the ranking rules see **CLAUDE.md**; for deploy steps
see **MORNING.md**.

---

## 1. What it is (one paragraph)

A public pay-to-rank leaderboard for Instagram profiles. A visitor pastes an
`@username`, picks a category, and pays through a hosted checkout so that profile's
**lifetime confirmed spend** reaches a target. Rank = total confirmed spend. Three
views of the same data: **All-time**, **Today** (rolling 24h), **Daily** (UTC day,
past days frozen). The leaderboard only ever changes after a **verified payment
webhook** — never on a browser "success".

---

## 2. System context

```
                    ┌─────────────────────────────────────────────┐
   Visitor  ─────▶  │   Vercel (Next.js 15 App Router)             │
   (browser)        │                                             │
                    │  • RSC pages  (/ , /today , /daily , …)      │
                    │  • Route handlers (/api/*)                   │
                    │  • Edge middleware (admin gate)              │
                    └───────┬───────────────┬─────────────────────┘
                            │               │
                   Prisma (pooled)   SDK (server-side only)
                            │               │
                    ┌───────▼──────┐  ┌─────▼───────────┐
                    │ Neon Postgres│  │ Dodo Payments   │
                    │  (serverless)│  │ hosted checkout │
                    └───────▲──────┘  └─────┬───────────┘
                            │               │
                            │      webhook (payment.succeeded, …)
                            │               │
                    ┌───────┴───────────────▼─────────────────────┐
                    │   POST /api/webhooks/dodo                    │
                    │   verify sig → dedupe → apply in txn         │
                    └─────────────────────────────────────────────┘
```

External dependencies: **Neon** (database), **Dodo Payments** (checkout + payouts),
**Vercel** (hosting/CDN/edge). No Redis, no queue, no object storage in v1.

---

## 3. Core domain model

| Entity | Role |
|---|---|
| `Listing` | one Instagram profile. `totalCents` = lifetime confirmed spend = all-time rank basis. One row per normalized username. |
| `Bid` | one paid contribution. `amountCents` = what the card was charged (the *difference* on a top-up). `confirmedAt` drives the time-window boards. |
| `Payment` | our record of a Dodo checkout/payment. Links a `Bid` to a provider payment id. |
| `WebhookEvent` | raw log of every webhook, unique on `(provider, eventId)` → idempotency + audit. |
| `ActivityEvent` | denormalized public feed row (no PII, no payment data). |
| `Category` | DB-driven; never hard-coded. |
| `Settings` | single row (id=1) with every business number ($10 start / $1 step / $5 to take #1 / $999,999 max / 24h window / kill-switches). |

**Ranking is additive.** A contribution only ever *adds* to `Listing.totalCents`, so
concurrent bids never need compare-and-set — they both apply and the total is the
sum. Ties break by older `createdAt`.

---

## 4. The two request paths that matter

### 4.1 Placing a bid (never trusts the browser)

```
POST /api/bids
  assertSameOrigin (CSRF)  ·  rateLimit(ip, 10/min)  ·  Zod validate
  → resolve/create Listing (P2002-safe on race)
  → server recomputes: min target, charge = target − listing.totalCents
  → create PENDING Bid + PENDING Payment  (one txn)
  → Dodo checkoutSessions.create({ amount: chargeCents, metadata, return_url })
  → return { checkoutUrl }
Browser → Dodo hosted checkout → pays → redirected to /checkout/return?bid=<id>
/checkout/return polls GET /api/bids/[id] until CONFIRMED / VOID / FAILED
```

Nothing here touches the leaderboard. The browser amount is advisory; the server
re-parses and re-validates every time.

### 4.2 Confirming a payment (the only writer of rank)

```
POST /api/webhooks/dodo
  1. verifyStandardWebhook(secret, rawBody, headers)   invalid → 401
  2. INSERT WebhookEvent (unique provider+eventId)     duplicate → dedupe, 200
  3. Serializable txn, retried on 40001/P2034:
       - mark Payment paid (idempotent)
       - if Bid still PENDING and Listing biddable:
           Listing.totalCents += Bid.amountCents   (atomic increment)
           Bid → CONFIRMED, confirmedAt = now
       - if Listing removed/disabled: Bid → VOID → auto-refund
  4. record ActivityEvent, mark WebhookEvent.processed = true
  processing error → 500 so Dodo retries (safe: idempotent)
```

`refund.succeeded` / `dispute.opened` run `recomputeListingTotal()` — rebuild the
total from CONFIRMED bids only.

---

## 5. Concurrency & correctness

| Scenario | How it's handled |
|---|---|
| Two people claim the same *new* username at once | `Listing.username` is unique; the loser catches `P2002` and re-reads the winner's row. |
| Two people top the same listing at once | Additive model — both `+= amountCents`. Serializable txn + retry serialize the two increments; final total is the sum. |
| Same webhook delivered twice (Dodo retry) | `WebhookEvent (provider,eventId)` unique → second delivery is deduped before any work. |
| Webhook processed, then a concurrent duplicate slips through | In-txn guard `bid.status !== "PENDING"` → second run is a no-op, no double increment. |
| Payment clears but listing was removed | Bid → `VOID`, auto-refund via Dodo, total untouched. |
| Money precision | Integer minor units everywhere. One module (`src/lib/money.ts`). No floats, ever. |

---

## 6. Security

- **Secrets** (Dodo keys, `AUTH_SECRET`, DB URL, admin creds): env only, never in
  source, never in the client bundle, never logged.
- **Webhook**: HMAC-SHA256 (Standard Webhooks), 5-min timestamp tolerance,
  constant-time compare, reject-then-dedupe-then-process.
- **Admin**: edge middleware + signed `jose` JWT cookie + `requireAdmin()` in every
  admin handler. Login rate-limited 5 / 5 min.
- **Mutating APIs**: same-origin check (CSRF) + per-IP rate limit + Zod.
- **Headers**: `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`,
  `Permissions-Policy` globally via `next.config.ts`.
- **Instagram input**: normalized + validated against a reserved-path denylist
  before it can become a listing.

---

## 7. Traffic & scaling

### 7.1 What the current design gives you for free

- **Vercel** auto-scales function instances; static/ISR assets are CDN-served.
- **Neon** pooled connection (`-pooler` + `pgbouncer=true`) absorbs the fan-out of
  many short-lived serverless invocations.
- All board reads are covered by composite indexes:
  - all-time: `Listing(status, totalCents desc, createdAt)`
  - windows: `Bid(status, confirmedAt)` and `Bid(listingId, status, confirmedAt)`
- The write path is a single short transaction touching ~3 rows.

Comfortably handles a **launch spike of thousands of concurrent readers** and a
steady stream of bids.

### 7.2 Where it bends first (and the fix, in order)

| Pressure point | Symptom under load | Fix |
|---|---|---|
| Every page is `force-dynamic` → a DB hit per view | Neon compute climbs with pure read traffic | Wrap board/category/activity reads in `unstable_cache` with a 5–15 s TTL (or `revalidateTag` busted from `confirmBidPayment`). Biggest single win. |
| `getWindowBoard` pulls all grouped rows and sorts in JS | Slow Today/Daily board once a window has ~10k+ bids | Push the sort+limit into SQL (`groupBy` + `orderBy: { _sum: { amountCents: 'desc' } }` + `take`), or add a `DailySpend` rollup table updated in the confirm txn. |
| `getTopCategories` = 2 queries per category | ~34 queries on the homepage | One grouped query, cached with the board data. |
| Rate limiter is in-memory per instance | Effective limit = limit × warm instances | Swap `src/lib/rate-limit.ts` for Upstash Redis (same interface, noted in the file). |
| Abandoned checkouts leave `PENDING` listings/bids | Slow table growth, minor | Cron (`vercel.json`) that marks `PENDING` bids older than ~2 h `CANCELLED` and deletes childless `PENDING` listings. |
| Webhook burst (e.g. mass refund) | Serializable retries pile up on one hot listing | Already bounded (4 retries, jittered). If it's ever a problem, move confirm to a queue (Inngest/QStash) with per-listing ordering. |
| Neon connection ceiling | `too many connections` errors | Raise pool size / upgrade Neon tier; the pooled URL is already the mitigation. |

### 7.3 Explicitly *not* needed for launch

Redis cache layer, message queue, read replicas, sharding, a separate API service.
The single-writer-via-webhook design means there's no distributed-consensus problem
to solve — Postgres transactions are enough.

---

## 8. Observability

- Structured logs via `src/lib/logger.ts` (`bid.intent.created`,
  `payment.confirm.applied`, `webhook.dodo.*`, `payment.refund.*`).
- `/admin/webhooks` — every event, `processed` flag, error text.
- `/admin` dashboard — listings, bids, payments, users, settings.
- Vercel → Deployments → Functions for server errors and cold-start timing.

**Add before scale:** a Neon slow-query alert, a Vercel function error-rate alert,
and a check that `WebhookEvent.processed = false` rows don't accumulate.

---

## 9. Failure modes & recovery

| Failure | Behaviour |
|---|---|
| Dodo checkout create fails | Bid → `FAILED`, Payment → `failed`, API returns 502, nothing charged. |
| Webhook arrives before our `/api/bids` txn commits | `findPaymentRecord` misses → handler returns `noop`; Dodo retries; second delivery finds the row. |
| Webhook processing throws | 500 → Dodo retries; `WebhookEvent` row keeps the error; idempotent replay is safe. |
| Neon briefly unavailable | Page renders an error boundary; writes fail loudly; no partial state (transactions). |
| Bad/replayed signature | 401, logged, no work done. |
