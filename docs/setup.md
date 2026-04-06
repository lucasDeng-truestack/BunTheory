# The Bun Theory — Setup Guide

Quick reference for starting the development environment.

**Other docs:** [`product.md`](./product.md) (access model, design notes) · [`cart-and-menu.md`](./cart-and-menu.md) (cart slugs & menu API contract) · [`branding.md`](./branding.md) (colors & UI tone) · root [`README.md`](../README.md) (overview, API table, deploy).

## 1. Start the Database (Docker Compose)

From the repo root:

```bash
npm run docker:up
```

This starts Postgres 15 on **localhost:5434** (same credentials as before: `postgres` / `password`, database `bun_theory`). Data is stored in a Docker volume so it survives restarts.

**Stop the database** (container removed; volume kept):

```bash
npm run docker:down
```

**If you used the old `docker run` workflow**, remove the old container once so the name `bun-theory-db` is free:

```bash
docker rm -f bun-theory-db
```

## 2. Backend

```bash
cd backend
npm run start:dev
```

Runs at http://localhost:3001

**First time only** (run migrations before seeding — tables must exist first):

```bash
cd backend
npx prisma migrate dev
npm run db:seed
```

Or from root: `npm run db:migrate` then `npm run db:seed`

## 3. Frontend

```bash
cd frontend
npm run dev
```

Runs at http://localhost:3000

---

## Quick Start (all services)

**From root directory** (runs backend + frontend together):

```bash
# 1. Database
docker start bun-theory-db

# 2. Install root deps (first time only)
npm install

# 3. Run both backend and frontend
npm run dev
```

**Or run separately** (each in its own terminal):

```bash
# 1. Database
docker start bun-theory-db

# 2. Backend
cd backend && npm run start:dev

# 3. Frontend
cd frontend && npm run dev
```

---

## Root Scripts (from project root)

| Command | Description |
|---------|-------------|
| `npm run dev` | Run backend + frontend concurrently |
| `npm run dev:frontend` | Run frontend only |
| `npm run dev:backend` | Run backend only |
| `npm run build` | Build both backend and frontend |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed the database |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:generate` | Generate Prisma client |
| `npm run lint` | Lint frontend |
