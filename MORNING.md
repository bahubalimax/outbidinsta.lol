# Morning checklist — get OutBidInsta live

Everything is built, typechecked, linted, unit-tested (60 passing), and **verified running against
your Neon database**. What's left is payments + deploy. ~20–30 min.

---

## Status right now

| Thing | State |
|---|---|
| Code | ✅ done — `npm run build` passes, all 50 routes serve |
| Neon Postgres | ✅ connected, migration applied, seeded (17 categories + settings + 8 demo listings) |
| Engine | ✅ verified — all-time / today / daily boards, top-up-charges-the-difference, tie-breaks |
| Admin | ✅ verified — login, dashboard, categories API, settings, listing actions |
| Security | ✅ verified — CSRF 403, bad webhook 401, rate limits, admin-only routes |
| Dodo payments | ⏳ **placeholders** — needs your keys (below) |
| Git | ✅ committed locally |
| GitHub / Vercel / DNS | ⏳ **your steps** (below) |

Local admin login (dev only): `mahesh.reddy@airtribe.live` / `obi-admin-Xk92mQ4pLz7wR3nT`
(change `ADMIN_PASSWORD` + regenerate `AUTH_SECRET` before production).

---

## Step 1 — Dodo Payments (the only real blocker)

1. **KYC / account approval** — make sure your Dodo account can accept live payments.
2. **Create the bid product:** Dodo dashboard → Products → New.
   - Pricing type: **Pay what you want**
   - Currency: **USD**
   - Save → copy the product id (`pdt_xxxxxxxx`).
3. **Get the API key:** Developer → API Keys → copy (there's a test key and a live key).
4. Give me these 4 values and I'll paste them + smoke-test a real test-mode checkout:
   - `DODO_API_KEY`
   - `DODO_BID_PRODUCT_ID`
   - `DODO_ENVIRONMENT` (`test_mode` first)
   - (webhook secret comes in Step 3, after deploy)

---

## Step 2 — GitHub + Vercel

1. Create an **empty private GitHub repo** named `outbidinsta` (no README).
2. Give me the repo URL — I'll push (or you run):
   ```bash
   git remote add origin git@github.com:<you>/outbidinsta.git
   git push -u origin main
   ```
3. Vercel → **New Project** → import `outbidinsta`. Framework = Next.js (auto).
4. **Storage tab** → attach the Neon database you already made (`outbidinsta`) to this project.
   Vercel injects `DATABASE_URL` + `DATABASE_URL_UNPOOLED`.
5. **Environment Variables** — add:
   | Key | Value |
   |---|---|
   | `DIRECT_DATABASE_URL` | *(paste the value of `DATABASE_URL_UNPOOLED`)* |
   | `NEXT_PUBLIC_SITE_URL` | `https://outbidinsta.lol` |
   | `AUTH_SECRET` | `openssl rand -base64 48` (fresh value) |
   | `ADMIN_EMAIL` | your email |
   | `ADMIN_PASSWORD` | a long random string |
   | `DODO_API_KEY` | from Step 1 |
   | `DODO_ENVIRONMENT` | `test_mode` |
   | `DODO_BID_PRODUCT_ID` | from Step 1 |
   | `DODO_WEBHOOK_SECRET` | placeholder for now, real value in Step 3 |
6. **Deploy.**
7. Run the migration against production once (locally is easiest):
   ```bash
   DIRECT_DATABASE_URL="<prod direct url>" npx prisma migrate deploy
   DIRECT_DATABASE_URL="<prod direct url>" DATABASE_URL="<prod direct url>" npm run db:seed
   ```
   *(the Neon project already has the schema + seed from tonight, so this may be a no-op — safe to run)*

---

## Step 3 — Domain + webhook

1. Vercel → Project → **Domains** → add `outbidinsta.lol`. Follow the DNS instructions
   (A record or nameservers at your registrar).
2. Once the domain resolves, in **Dodo → Developer → Webhooks → Add endpoint**:
   - URL: `https://outbidinsta.lol/api/webhooks/dodo`
   - Events: `payment.succeeded`, `payment.failed`, `payment.cancelled`, `refund.succeeded`,
     `dispute.opened`
   - Copy the **signing secret** → set Vercel env `DODO_WEBHOOK_SECRET` → **redeploy**.
3. Test: on the live site, do a bid in test mode with a Dodo test card. Confirm the leaderboard
   updates only after checkout completes, and check `/admin/webhooks` shows the event `processed`.

---

## Step 4 — Go live

- Flip `DODO_ENVIRONMENT` to `live_mode`, swap in the **live** API key and a **live-mode** webhook
  secret, redeploy.
- In `/admin/settings`, confirm the numbers ($10 start / +$1 / +$5 to take #1 / $999,999 max /
  24h window) or change them.
- Optional: clear the demo data — `/admin/listings` → each demo listing → "Remove", or ask me to
  run a cleanup.

---

## If something's off

- Every route's status, the engine math, and the admin flow were verified tonight — see the
  session transcript.
- `npm run build` + `npm test` are the gates. Both green.
- Logs: `/admin/webhooks` for payment events; Vercel → Deployments → Functions for server errors.
