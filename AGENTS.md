# AGENTS.md

## Cursor Cloud specific instructions

### Services (Bun Theory core dev)

| Service | Port | Start |
|---------|------|--------|
| PostgreSQL | 5432 (apt) or **5435** (Docker Compose host map) | See database section below |
| NestJS API | 3001 | `cd backend && set -a && source .env && set +a && npm run start:dev` |
| Next.js storefront | 3000 | `cd frontend && PORT=3000 npm run dev` |

From repo root, `npm run dev` also starts **Weekend Grills POS** on **3011** (`weekend-grills-pos`). Skip POS if you only need the main ordering site.

Standard commands are documented in [`README.md`](README.md) and [`docs/setup.md`](docs/setup.md).

### Database

- **Docker** (when available): `npm run docker:up` — Postgres on **localhost:5435** (`docker-compose.yml`). Align `backend/.env` `DATABASE_URL` with port **5435**, not 5432.
- **Cloud VM without Docker**: system Postgres on **5432** is fine (`postgresql` apt package). Create role/db if needed:
  - User `bun_theory` / password `password`, database `bun_theory`.
- First-time schema: `npm run db:migrate` (or `cd backend && npx prisma migrate deploy`).
- Seed: `cd backend && set -a && source .env && set +a && npm run db:seed` — `ts-node` does not load `.env` by itself.

### Environment files

Copy once if missing:

- `backend/.env` from `backend/.env.example`
- `frontend/.env.local` from `frontend/.env.local.example` (`NEXT_PUBLIC_API_URL=http://localhost:3001`)

### Gotchas

- **Port clash**: If something else binds **3001**, Next.js may take it and Nest will fail with `EADDRINUSE`. Run frontend with `PORT=3000` and restart the backend.
- **Ordering closed (`NO_BATCH`)**: Storefront needs a **published** order batch (admin → Batches) before `POST /orders` succeeds. Smoke tests can publish via admin API (`POST /batches`, then `POST /batches/:id/publish`).
- **Menu items require drink option**: Seeded buns have a required "Drinks" option group; orders must include `selections` with `groupId` / `optionIds`.
- **Seed admin** (from `backend/src/database/seed.ts`): `denglucasyijin@gmail.com` / `Lucas@123` (not the older README `admin@buntheory.com` example).
- **Docs vs compose**: `docs/setup.md` mentions Postgres port **5434**; the compose file uses **5435**.

### Lint / build / test

| Task | Command |
|------|---------|
| Lint (frontend) | `npm run lint` (root) |
| Build backend | `cd backend && npm run build` |
| Build frontend | `cd frontend && NEXT_PUBLIC_API_URL=http://localhost:3001 npm run build` |
| CI parity | Node **24** in `.github/workflows/ci.yml`; local Node 22+ usually works |

No automated E2E test suite in-repo; verify with API curls or the browser against `http://localhost:3000`.

### Optional integrations

Twilio WhatsApp and S3/R2 are optional; the API runs without them (notifications log as skipped; uploads use `backend/uploads/`).
