# The Bun Theory — Product & Access Model

Single-restaurant ordering (GrabFood-style flow) for **The Bun Theory by Bakar & Roast**. This document is the reference for **who can do what** and **how the public site is meant to behave**.

## Customer experience

- **No login or signup.** Customers identify at checkout with **name** and **phone number** (and any fields the order flow already collects).
- Browse menu, cart, and place orders for **pickup or delivery** (per backend capabilities).
- **Track in-progress orders** by phone on `/track`: shows only **active** statuses (received / preparing / ready), not completed deliveries, and only recent orders (see `docs/cart-and-menu.md` / API). No account required.
- **Mobile-first** web app: optimize for phones; **desktop layouts** should remain usable and responsive (wider grids, comfortable spacing).

## Admin experience

- Admins **manage orders** (view, update status) and **menu** (and related settings such as max orders per day), per the implementation.
- **Discovery:** the admin UI is **not linked** from public customer pages. Access is by **typing or bookmarking the admin URL** so casual visitors do not see an “Admin” entry point. This is **security through obscurity** and is acceptable only as a **temporary** measure for a small deployment.
- **API protection:** admin REST endpoints should remain **authenticated** (for example JWT after login). Hiding the URL does not replace server-side checks.
- The app may expose an admin **login** route for staff; that is separate from **customer** accounts (customers never sign in).

## Design & UI source of truth

- **Brand colors and theme** live in [`branding.md`](./branding.md).
- **Typography standard:** display text uses the project Comic Sans fallback stack for
  headings, nav labels, titles, and CTA copy; body copy remains in the sans body font
  unless intentionally changed.
- **Layout and component patterns** may follow exported references when present in the repo, for example:
  - `Icons/` — icon assets
  - `UI Design/` — frames or style notes
  - `Preview/` — screen previews  
  - [`design-references/`](./design-references/) — optional UX mockups (e.g. admin dashboard); add files such as `design-references/admin-dashboard-reference.png` when tracking a reference image in-repo.  
  Paths are conventional; add these folders under the project when assets are available. Until then, implement with the existing stack (Next.js, Tailwind, shadcn/ui) and branding tokens.

## Notifications

- The Bun Theory ordering app sends no automated admin or customer messages. Order status is shown on the order tracking page.
- Bakar & Roast catering sends email through Resend (request received, approved, declined, cancelled, expired; new request and customer cancellation to the owner). With no `RESEND_API_KEY` the API runs and emails are skipped.

## Bakar & Roast catering bookings

- Customers book on the Bakar & Roast site (`bakar-roast/`, port 3200): pick an open date, a package and headcount, give event and contact details. One event per day.
- A new request is **PENDING** and holds its date at once. The owner calls the customer, then approves or declines in the admin. Statuses: PENDING, APPROVED, DECLINED, CANCELLED, EXPIRED, COMPLETED.
- Rules the owner can change (`PATCH /settings/catering`): minimum notice (7 days), booking window (6 months), pending hold expiry (3 days), customer cancellation cutoff (7 days before the event), notification email.
- A customer can have at most 2 pending requests (matched by email or phone).
- No prices are shown to customers. The owner records quote, deposit and balance privately on the booking.
- API lives in `backend/src/modules/catering/` (public routes under `/catering`, admin routes under `/catering/admin`). Full contract: [`bakar-roast-catering-plan.md`](./bakar-roast-catering-plan.md).

## Cart & menu (technical)

Customer cart lines are keyed by **menu `slug`**, not database UUIDs, and the menu is refreshed from the backend so the UI and cart validator stay in sync. See [`cart-and-menu.md`](./cart-and-menu.md) for the full contract and troubleshooting checklist.
