# AGENTS.md

## Cursor Cloud specific instructions

### Services (Bun Theory core dev)

| Service | Port | Start |
|---------|------|--------|
| PostgreSQL | 5432 (apt) or **5437** (Docker Compose host map) | See database section below |
| NestJS API | 3101 | `cd backend && set -a && source .env && set +a && npm run start:dev` |
| Next.js storefront | 3000 | `cd frontend && PORT=3000 npm run dev` |

From repo root, `npm run dev` also starts **Weekend Grills POS** on **3011** (`weekend-grills-pos`). Skip POS if you only need the main ordering site.

Standard commands are documented in [`README.md`](README.md) and [`docs/setup.md`](docs/setup.md).

### Database

- **Docker** (when available): `npm run docker:up` — Postgres on **localhost:5437** (`docker-compose.yml`). Align `backend/.env` `DATABASE_URL` with port **5437**, not 5432.
- **Cloud VM without Docker**: system Postgres on **5432** is fine (`postgresql` apt package). Create role/db if needed:
  - User `bun_theory` / password `password`, database `bun_theory`.
- First-time schema: `npm run db:migrate` (or `cd backend && npx prisma migrate deploy`).
- Seed: `cd backend && set -a && source .env && set +a && npm run db:seed` — `ts-node` does not load `.env` by itself.

### Environment files

Copy once if missing:

- `backend/.env` from `backend/.env.example`
- `frontend/.env.local` from `frontend/.env.local.example` (`NEXT_PUBLIC_API_URL=http://localhost:3101`)

### Gotchas

- **Port clash**: If something else binds **3101**, Next.js may take it and Nest will fail with `EADDRINUSE`. Run frontend with `PORT=3000` and restart the backend.
- **Ordering closed (`NO_BATCH`)**: Storefront needs a **published** order batch (admin → Batches) before `POST /orders` succeeds. Smoke tests can publish via admin API (`POST /batches`, then `POST /batches/:id/publish`).
- **Menu items require drink option**: Seeded buns have a required "Drinks" option group; orders must include `selections` with `groupId` / `optionIds`.
- **Seed admin** (from `backend/src/database/seed.ts`): `denglucasyijin@gmail.com` / `Lucas@123` (not the older README `admin@buntheory.com` example).
- **Docs vs compose**: `docs/setup.md` mentions Postgres port **5434**; the compose file uses **5437**.

### Lint / build / test

| Task | Command |
|------|---------|
| Lint (frontend) | `npm run lint` (root) |
| Build backend | `cd backend && npm run build` |
| Build frontend | `cd frontend && NEXT_PUBLIC_API_URL=http://localhost:3101 npm run build` |
| CI parity | Node **24** in `.github/workflows/ci.yml`; local Node 22+ usually works |

No automated E2E test suite in-repo; verify with API curls or the browser against `http://localhost:3000`.

### Optional integrations

S3/R2 is optional; the API runs without it (uploads use `backend/uploads/`).

Resend email (Bakar & Roast catering) is optional: set `RESEND_API_KEY`, `EMAIL_FROM` and `PUBLIC_SITE_URL` in `backend/.env`. Without a key, emails are logged as skipped.

### Auth (Better Auth)

- Login for staff and customers is Better Auth inside the backend (`/api/auth/*`). `backend/.env` must have `BETTER_AUTH_SECRET` (`openssl rand -base64 32`) and `BETTER_AUTH_URL=http://localhost:3101`, or the API will not start.
- Staff log in through `POST /auth/login` (password) or with an emailed code: `POST /auth/login/code` `{email}` (answers `{sent:true}` for any email, sends only to staff, never creates an account), then `POST /auth/login/code/verify` `{email, code}` (same response as `/auth/login`; 401 for a wrong or expired code or a non-staff email). The admin login page offers both. Codes are capped per email (5 sends and 10 tries an hour, in memory, `backend/src/modules/auth/email-code-limit.ts`, via Better Auth's before-hook, which also runs for server-side `auth.api` calls); staff are never emailed a password-reset code. Staff emails also get codes on the public sites, where a staff member signs in like a customer and keeps their orders; the returned `accessToken` is a session token, not a JWT. Protect admin routes with `AdminAuthGuard`; customer routes with `CustomerAuthGuard`.
- Locally there is no email provider, so customer sign-in codes are printed in the backend log.

### Bakar & Roast site

- `cd bakar-roast && npm run dev` runs the public brand and ordering site on **3200**. Copy `bakar-roast/.env.local.example` to `.env.local`. It no longer contains the admin.
- Site routes (public only): `/` (home; `/catering` redirects there), `/order` + `/order/<token>`, `/account` (optional customer sign-in and "My orders"). `/dev/components` shows every UI component. The old catering pages (`/catering/book`, `/booking/<token>`) are gone; they redirect to `/` so old email links and bookmarks do not 404.
- **Admin is its own app** — `cd bakar-roast-admin && npm run dev` on **3300** (copy `bakar-roast-admin/.env.local.example` to `.env.local`; needs its own `npm install`). Deploys to `admin.bakarandroast.site`. Routes keep the `/admin/*` prefix: home `/admin` opens the shop orders, The Bun Theory at `/admin/bun-theory/*` (board, orders, receipts, batches, menu, feedback, settings), shop at `/admin/shop-orders` + `/admin/shop-schedule`, staff at `/admin/team`, login at `/admin/login` (same seed admin login). The new app's origin must be in the backend CORS allowlist (`http://localhost:3300` is a default; add the prod origin via `FRONTEND_URLS`).
- Both public sites redirect `/admin/*` onward to the admin app: `bakar-roast` and `frontend` read `ADMIN_URL` (default `http://localhost:3300`) — set it to `https://admin.bakarandroast.site` in production. The admin app shares `bakar-roast`'s UI/lib by copy (the repo has no workspaces), so shared-component changes may need mirroring in both.
- The live order feeds (`/orders`, `/pos` sockets) need a staff session: connect with `auth: { token }`.
- Set `NEXT_PUBLIC_BUN_THEORY_URL` in production, or The Bun Theory links point at localhost.
- **Catering is no longer booked online.** `POST /catering/bookings` returns `410 CATERING_CLOSED` unless `CATERING_REQUESTS_OPEN=true` is set in `backend/.env`, and the catering admin screens were removed (existing bookings stay in the database; the screens are in git history). Catering emails now link to WhatsApp (with the booking reference) and `/order`; owner emails link to `ADMIN_URL`. With requests reopened: a date is bookable only inside the notice and window rules. Each day takes `cateringDailySets` bookings (Settings), or that day's own number (`PATCH /catering/admin/days/:date`); with `cateringDailyLimitOn` off (Settings switch) a day without its own number takes any number of bookings; a full or closed day returns `409 DATE_TAKEN`. Close or open ranges with `POST /catering/admin/days/close|open`. Customers upload payment receipts with `POST /catering/bookings/:accessToken/receipts`.

#### Shop order flow (`/order`) — the pivot from catering booking

The public site now leads with online ordering. `/order` (Order Now) is a menu-first flow like a takeaway site (a delivery-or-pickup modal on entry that also takes the delivery address, then a package menu with a details view and the order beside it, then a single checkout view for date, contact and payment choice) backed by `backend/src/modules/shop/` (models `ShopOrder`/`ShopOrderItem`/`ShopReceipt`). The order is saved server-side **before** any payment detail, then served from `/order/<accessToken>`, so a mobile refresh or return-from-bank never loses it. Manual payment (bank/QR), pay half (`DEPOSIT`) or full; customer uploads a receipt; owner confirms at `/admin/shop-orders`.
- Shop API smoke test: `GET /shop/config` (packages, pickup area, min/max date, default hours, ordersOpen), `GET /shop/availability` (live open dates + the slots on each; uncached), `POST /shop/orders` (server computes price from the `ShopPackage` table; a hidden or deleted package returns `PACKAGE_UNAVAILABLE`; `idempotencyKey` dedupes), `GET /shop/orders/:accessToken`, `POST /shop/orders/:accessToken/receipts`. Admin: `GET /shop/admin/orders`, `POST /shop/admin/orders/:id/payment` `{stage: DEPOSIT|FULL}`, `.../cancel` (AdminAuthGuard; OWNER/MANAGER for writes).
- **Availability is owner-configurable (DB-backed).** Rules live in `SystemSettings` (`shopEarliestDate`, `shopOrdersOpenDate` — null = open now, `shopMinNoticeDays`, `shopWindowDays`, `shopServeStart/End` on the hour), edited via `PATCH /settings/shop` (OWNER/MANAGER). Per-day overrides (closed, serving hours) live in `ShopDay` (mirrors `CateringDay`), edited via `GET /shop/admin/schedule`, `POST /shop/admin/days/close|open|hours`, `PATCH /shop/admin/days/:date`. Admin UI: `bakar-roast` → `/admin/shop-schedule`. Order validation (`ORDERS_NOT_OPEN`, `DATE_OUT_OF_RANGE`, `DATE_CLOSED`, `SLOT_UNAVAILABLE`) is all server-side; no capacity, so no day lock. Slots are back-to-back windows of `shopSlotMinutes` (30/60/90/120) generated from each day's serving hours, which may start on the hour or half hour; start-only hours are allowed (end falls back to default). The Schedule screen is a three-step setup (ordering dates, time slots, days off on a calendar). The admin home is `/admin/shop-orders`.
- **Packages are owner-editable (DB-backed).** The `/order` menu is the `ShopPackage` table, edited at `/admin/shop-packages` (name, price, short line, description, what's included, up to 6 photos via `POST /uploads/image`, shown/hidden, order). API: `GET|POST /shop/admin/packages`, `PATCH|DELETE /shop/admin/packages/:id`, `POST /shop/admin/packages/reorder` `{ids}` (OWNER/MANAGER for writes). `GET /shop/config` returns only shown packages and is fetched uncached. Order items copy the name and price and hold the package id as a plain string, so editing or deleting a package never changes past orders. The migration seeded the three old placeholders with ids `A`, `B`, `C`.
- **Customer accounts are optional.** `/account` signs a customer in with an emailed 6-digit code (Better Auth email OTP; needs `RESEND_API_KEY` + `EMAIL_FROM` in production, codes are printed in the backend log locally). A signed-in order is saved with `ShopOrder.userId`; `GET /shop/me` (CustomerAuthGuard) returns the customer's orders and `details` to prefill checkout, both from `userId` orders only (a guest order is never matched by its typed, unverified email). Guests can always order; `POST /shop/orders` uses `OptionalAuthGuard`. Checkout also has a "Remember my details on this device" switch (localStorage).
- **Payment is step 3.** The saved order page leads with payment while unpaid: bank details with the order reference as the transfer reference, then three ways to send the receipt (upload, a pre-filled WhatsApp chat, or a QR of the page to open it on a phone). The order reads as placed once a receipt is uploaded.
- **Payment details and the WhatsApp number are owner-editable** at `/admin/shop-payment` (saved with `PATCH /settings/shop`: `shopBankName`, `shopBankAccountName`, `shopBankAccountNumber`, `shopPaymentQrUrl`, `shopWhatsappNumber`; empty string clears). Bank and QR live in the `cateringBank*` / `cateringPaymentQrUrl` columns (one set for the brand) and come back as `payment` on `GET /shop/orders/:accessToken`; with none set, the order page asks the customer to message for details. The number lives in `shopWhatsappNumber` (digits with country code; null = `SHOP_WHATSAPP_DEFAULT`) and is served by `GET /shop/contact`. Every WhatsApp link on the site and in emails goes to the site's `/wa?text=…` route, which redirects to `wa.me/<saved number>` (cached 60s), so `waLink()` never holds a number.
- **The Bun Theory storefront has the same optional sign-in** (same accounts): `frontend/app/account` (email code, then "My orders"), checkout prefills name and phone from `GET /orders/me` (CustomerAuthGuard, `userId` orders only). `POST /orders` uses `OptionalAuthGuard`; public order responses never include `userId`. The token is kept under `bun-theory.customer-token`, so each site has its own sign-in. Code emails requested from `BUN_THEORY_URL` (backend env, e.g. `https://buntheory.bakarandroast.site`) are branded The Bun Theory.
- Placeholders to replace before launch: the three seeded packages, and the bank details and QR (both in the admin).
- Admin now lives in its own app (`bakar-roast-admin/`, port 3300) for `admin.bakarandroast.site`; the shop screens (`/admin/shop-orders`, `/admin/shop-schedule`) moved with it.
