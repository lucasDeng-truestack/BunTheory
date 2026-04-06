# The Bun Theory by Bakar & Roast

A lightweight GrabFood-style food ordering system for a single restaurant. Customers order **without an account** (name and phone at checkout). Staff use an **admin area** to manage orders and the menu.

## Documentation

| Doc | Purpose |
| --- | --- |
| [docs/product.md](docs/product.md) | Customer vs admin access, mobile/desktop goals, optional design asset folders (`Icons/`, `UI Design/`, `Preview/`) |
| [docs/cart-and-menu.md](docs/cart-and-menu.md) | Cart vs backend menu (slugs, API fetch, persistence) — avoids add/remove cart bugs |
| [docs/branding.md](docs/branding.md) | Colors, typography, UI tone, responsive notes |
| [docs/setup.md](docs/setup.md) | Database (Docker), dev commands, root npm scripts |

## Tech Stack

| Layer    | Technology      |
| -------- | --------------- |
| Frontend | Next.js 15, TypeScript, TailwindCSS, shadcn/ui |
| Backend  | NestJS, Prisma, PostgreSQL |
| Deploy   | Vercel (frontend), Railway (backend), Neon (DB) |
| Notifications | Twilio WhatsApp API |

## UI Notes

- Display typography uses the project Comic Sans fallback stack for headings, titles,
  navbar labels, and CTA text.
- Body copy remains in the existing sans font for readability.

## Project Structure

```
Bun-Theory/
├── frontend/     # Next.js App Router
├── backend/      # NestJS API
├── docs/         # Product, branding, setup
└── .cursor/      # Editor rules
```

Optional design exports (when added): e.g. `Icons/`, `UI Design/`, `Preview/` — see [docs/product.md](docs/product.md).

## Quick Start

### 1. Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your DATABASE_URL, JWT_SECRET, Twilio credentials
npm install
npx prisma migrate dev
npm run db:seed
npm run start:dev
```

Backend runs at http://localhost:3001

### 2. Frontend

```bash
cd frontend
cp .env.local.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:3001
npm install
npm run dev
```

Frontend runs at http://localhost:3000

### 3. Admin access

- **Customer site** has no login; do not link the admin UI from public pages. Bookmark the admin URL (e.g. `/admin/...`) for staff only — see [docs/product.md](docs/product.md).
- **Admin login** (for protected API routes), if enabled in your build:
  - Email: `admin@buntheory.com`
  - Password: `admin123`

## Features

**Customer**

- View menu, add to cart, checkout (**name + phone**, no account)
- Pickup or delivery
- WhatsApp confirmation
- Live order counter
- Order status progress
- **Mobile-first** layout; **desktop** responsive

**Admin**

- Dashboard with live order counter
- Manage orders, update status
- Set max orders per day
- Toggle ordering on/off
- Upload menu items and images

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /menu | - | List menu |
| POST | /menu | Admin | Create menu item |
| PATCH | /menu/:id | Admin | Update menu item |
| DELETE | /menu/:id | Admin | Delete menu item |
| POST | /orders | - | Create order |
| GET | /orders | Admin | List today's orders |
| GET | /orders/:id | - | Get order (for status) |
| PATCH | /orders/:id/status | Admin | Update order status |
| GET | /orders/can-order | - | Check if ordering is open |
| POST | /auth/login | - | Admin login |
| PATCH | /settings/max-orders | Admin | Set max orders |
| PATCH | /settings/toggle-ordering | Admin | Toggle ordering |

## WhatsApp Setup

1. Create a Twilio account
2. Enable WhatsApp Sandbox or Business API
3. Add to `.env`:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_WHATSAPP_FROM` (e.g. `whatsapp:+14155238886`)
   - `ADMIN_WHATSAPP_NUMBER` (e.g. `whatsapp:+60123456789`)

Customer phone numbers must include country code (e.g. `+60123456789`).
