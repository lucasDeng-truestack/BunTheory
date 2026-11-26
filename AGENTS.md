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
- Staff still log in through `POST /auth/login`; the returned `accessToken` is a session token, not a JWT. Protect admin routes with `AdminAuthGuard`; customer routes with `CustomerAuthGuard`.
- Locally there is no email provider, so customer sign-in codes are printed in the backend log.

### Bakar & Roast site

- `cd bakar-roast && npm run dev` runs the public brand, catering and ordering site on **3200**. Copy `bakar-roast/.env.local.example` to `.env.local`. It no longer contains the admin.
- Site routes (public only): `/` (home and catering in one page; `/catering` redirects there), `/catering/book`, `/booking/<token>`, `/account`, `/order` + `/order/<token>`. `/dev/components` shows every UI component.
- **Admin is its own app** — `cd bakar-roast-admin && npm run dev` on **3300** (copy `bakar-roast-admin/.env.local.example` to `.env.local`; needs its own `npm install`). Deploys to `admin.bakarandroast.site`. Routes keep the `/admin/*` prefix: catering at `/admin/*`, The Bun Theory at `/admin/bun-theory/*` (board, orders, receipts, batches, menu, feedback, settings), shop at `/admin/shop-orders` + `/admin/shop-schedule`, staff at `/admin/team`, login at `/admin/login` (same seed admin login). The new app's origin must be in the backend CORS allowlist (`http://localhost:3300` is a default; add the prod origin via `FRONTEND_URLS`).
- Both public sites redirect `/admin/*` onward to the admin app: `bakar-roast` and `frontend` read `ADMIN_URL` (default `http://localhost:3300`) — set it to `https://admin.bakarandroast.site` in production. The admin app shares `bakar-roast`'s UI/lib by copy (the repo has no workspaces), so shared-component changes may need mirroring in both.
- The live order feeds (`/orders`, `/pos` sockets) need a staff session: connect with `auth: { token }`.
- Set `NEXT_PUBLIC_BUN_THEORY_URL` in production, or The Bun Theory links point at localhost.
- Catering API smoke test: `GET /catering/packages`, `GET /catering/availability`, `POST /catering/bookings`. A date is bookable only inside the notice and window rules. Each day takes `cateringDailySets` bookings (Settings), or that day's own number (`PATCH /catering/admin/days/:date`); a full or closed day returns `409 DATE_TAKEN`. Close or open ranges with `POST /catering/admin/days/close|open`. Customers upload payment receipts with `POST /catering/bookings/:accessToken/receipts`.

#### Shop order flow (`/order`) — the pivot from catering booking

The public site now leads with online ordering. `/order` (Order Now) is a simple pick-packages → cart → checkout flow backed by `backend/src/modules/shop/` (models `ShopOrder`/`ShopOrderItem`/`ShopReceipt`). The order is saved server-side **before** any payment detail, then served from `/order/<accessToken>`, so a mobile refresh or return-from-bank never loses it. Manual payment (bank/QR), pay half (`DEPOSIT`) or full; customer uploads a receipt; owner confirms at `/admin/shop-orders`.
- Shop API smoke test: `GET /shop/config` (packages, pickup area, min/max date, default hours, ordersOpen), `GET /shop/availability` (live open dates + the slots on each; uncached), `POST /shop/orders` (server computes price from `shop.config.ts`; `idempotencyKey` dedupes), `GET /shop/orders/:accessToken`, `POST /shop/orders/:accessToken/receipts`. Admin: `GET /shop/admin/orders`, `POST /shop/admin/orders/:id/payment` `{stage: DEPOSIT|FULL}`, `.../cancel` (AdminAuthGuard; OWNER/MANAGER for writes).
- **Availability is owner-configurable (DB-backed).** Rules live in `SystemSettings` (`shopEarliestDate`, `shopOrdersOpenDate` — null = open now, `shopMinNoticeDays`, `shopWindowDays`, `shopServeStart/End` on the hour), edited via `PATCH /settings/shop` (OWNER/MANAGER). Per-day overrides (closed, serving hours) live in `ShopDay` (mirrors `CateringDay`), edited via `GET /shop/admin/schedule`, `POST /shop/admin/days/close|open|hours`, `PATCH /shop/admin/days/:date`. Admin UI: `bakar-roast` → `/admin/shop-schedule`. Order validation (`ORDERS_NOT_OPEN`, `DATE_OUT_OF_RANGE`, `DATE_CLOSED`, `SLOT_UNAVAILABLE`) is all server-side; no capacity, so no day lock. Slots are whole-hour windows generated from each day's serving hours; start-only hours are allowed (end falls back to default).
- Placeholders to replace before launch: package names/prices (`shop.config.ts`), bank + QR (`bakar-roast/lib/shop.ts` `SHOP_PAYMENT`, `public/images/payment-qr.svg`).
- Admin now lives in its own app (`bakar-roast-admin/`, port 3300) for `admin.bakarandroast.site`; the shop screens (`/admin/shop-orders`, `/admin/shop-schedule`) moved with it.
