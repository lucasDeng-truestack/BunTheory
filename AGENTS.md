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

- `cd bakar-roast && npm run dev` runs the brand and catering site on **3200**. Copy `bakar-roast/.env.local.example` to `.env.local`.
- Site routes: public `/` (home and catering in one page; `/catering` redirects there), `/catering/book`, `/booking/<token>`, `/account`; owner admin `/admin` (same seed admin login). `/dev/components` shows every UI component.
- The admin for everything lives here: catering at `/admin/*`, The Bun Theory at `/admin/bun-theory/*` (board, orders, receipts, batches, menu, feedback, settings), staff at `/admin/team`. The storefront's old `/admin/*` redirects here; set `BAKAR_ROAST_URL` on the storefront in production.
- The live order feeds (`/orders`, `/pos` sockets) need a staff session: connect with `auth: { token }`.
- Set `NEXT_PUBLIC_BUN_THEORY_URL` in production, or The Bun Theory links point at localhost.
- Catering API smoke test: `GET /catering/packages`, `GET /catering/availability`, `POST /catering/bookings`. A date is bookable only inside the notice and window rules. Each day takes `cateringDailySets` bookings (Settings), or that day's own number (`PATCH /catering/admin/days/:date`); a full or closed day returns `409 DATE_TAKEN`. Close or open ranges with `POST /catering/admin/days/close|open`. Customers upload payment receipts with `POST /catering/bookings/:accessToken/receipts`.
