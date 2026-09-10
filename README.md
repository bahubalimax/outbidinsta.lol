# OutBidInsta

A public, pay-to-rank leaderboard for **Instagram profiles**. Paste an `@username`, choose a
category, and pay so the profile's lifetime spend reaches a target. The highest **confirmed** paid
total is #1.

Three boards:

- **All-time** — ranked by lifetime spend, never resets.
- **Today** — a rolling 24 hours.
- **Daily** — a single UTC calendar day, with past days kept as a frozen archive.

> OutBidInsta is an independent platform and is **not affiliated with Instagram or Meta**.

---

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · PostgreSQL + Prisma · Tailwind CSS v4 ·
Dodo Payments · Vitest.

## Prerequisites

- Node.js 20+
- A PostgreSQL database (Neon recommended)
- A Dodo Payments account

## 1. Install

```bash
npm install
cp .env.example .env      # then fill in real values (see below)
```

## 2. Environment

Edit `.env`:

| Variable | What |
|---|---|
| `DATABASE_URL` | **Pooled** Postgres URL used by the app. Neon: the `-pooler` host + `&pgbouncer=true`. |
| `DIRECT_DATABASE_URL` | **Direct** (non-pooled) URL used for migrations. Same value if you have only one. |
| `NEXT_PUBLIC_SITE_URL` | Public base URL, no trailing slash. `https://outbidinsta.lol` |
| `DODO_API_KEY` | Dodo API key (Developer → API Keys). |
| `DODO_WEBHOOK_SECRET` | Signing secret for the `…/api/webhooks/dodo` endpoint (Developer → Webhooks). |
| `DODO_ENVIRONMENT` | `test_mode` or `live_mode`. |
| `DODO_BID_PRODUCT_ID` | Id of ONE Dodo product with **"Pay what you want"** pricing enabled, currency USD. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Credentials for `/admin`. Use a long random password. |
| `AUTH_SECRET` | ≥32 chars, signs the admin cookie. `openssl rand -base64 48` |
| `SUPPORTED_CURRENCIES` | Optional. Default `USD,EUR,GBP,INR`. |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | Optional. Shown on the contact page. |

## 3. Database

```bash
npm run prisma:deploy     # apply migrations (uses DIRECT_DATABASE_URL)
npm run db:seed           # seed the 17 categories + settings row
SEED_DEMO=1 npm run db:seed   # (optional) also add demo listings/bids
```

## 4. Dodo Payments setup

1. **Create the bid product.** Dashboard → Products → New product.
   - Pricing: **Pay what you want** (this lets each bid carry its own amount).
   - Currency: **USD**.
   - Copy the product id (`pdt_…`) into `DODO_BID_PRODUCT_ID`.
2. **Create the webhook.** Dashboard → Developer → Webhooks → Add endpoint.
   - URL: `https://<your-domain>/api/webhooks/dodo`
   - Events: at least `payment.succeeded`, `payment.failed`, `payment.cancelled`,
     `refund.succeeded`, `dispute.opened`.
   - Copy the signing secret into `DODO_WEBHOOK_SECRET`.
3. Set `DODO_API_KEY` and `DODO_ENVIRONMENT`.

The app verifies every webhook's signature and timestamp, dedupes by `webhook-id`, and only
changes the leaderboard after a verified `payment.succeeded`.

## 5. Run

```bash
npm run dev        # http://localhost:3000
```

Admin dashboard: `http://localhost:3000/admin` (sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`).

## Testing

```bash
npm test           # 60 unit tests — Instagram normalization, money, the bidding engine,
                   # date windows, webhook verification, admin tokens. No database required.
npm run typecheck
npm run lint
```

## Production deployment (Vercel)

1. Push this repo to GitHub.
2. Vercel → New Project → import the repo.
3. **Storage** → connect a Neon Postgres database to the project (auto-adds `DATABASE_URL` and
   `DATABASE_URL_UNPOOLED`). Also add:
   - `DIRECT_DATABASE_URL` = the value of `DATABASE_URL_UNPOOLED`
   - `NEXT_PUBLIC_SITE_URL`, `DODO_*`, `ADMIN_*`, `AUTH_SECRET`
4. Deploy. The build runs `prisma generate && next build`.
5. Run the migration once (Vercel shell, or locally against the prod `DIRECT_DATABASE_URL`):
   ```bash
   npm run prisma:deploy && npm run db:seed
   ```
6. Point `outbidinsta.lol` DNS at Vercel (Project → Domains).
7. In Dodo, set the webhook URL to `https://outbidinsta.lol/api/webhooks/dodo` and paste its
   secret into the Vercel env var `DODO_WEBHOOK_SECRET`. Redeploy.
8. Flip `DODO_ENVIRONMENT=live_mode` and use the live API key when you're ready to take real money.

## Project layout

```
prisma/schema.prisma        models + migrations
src/lib/                     engine (bidding, leaderboard, payments, dodo, webhook-verify, money, …)
src/app/                     routes (App Router) + API handlers
src/app/api/webhooks/dodo/   the verified payment webhook
src/components/              UI (board screen, claim form, leaderboard rows, admin, …)
tests/                       Vitest suites (pure functions)
```

See **CLAUDE.md** for the ranking model, payment flow, and conventions in detail.

## Security notes

- Secrets live in env only, never in source or the client bundle, never logged.
- The webhook rejects invalid signatures / stale timestamps and is idempotent.
- `/admin` and `/api/admin` are gated by middleware + a signed cookie; login is rate-limited.
- Bid amounts from the browser are advisory — the server recomputes the minimum and the charge.
- Mutating API routes enforce same-origin (CSRF) and per-IP rate limits.
