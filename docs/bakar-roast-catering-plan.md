# Bakar & Roast catering revamp: plan and design brief

## Context

Bakar & Roast (`bakar-roast/`, Next 15, port 3200) is the umbrella brand site. Catering is the
flagship, but today the site only has a WhatsApp enquiry form with no backend, a static story
page, placeholder gallery and testimonials, and no admin. The owner wants customers to book
catering on a real availability calendar, pick a package, and have each request land with the
owner for approval (the owner may phone the customer first). The admin is to live in Bakar &
Roast from now on, Twilio is to be removed, and email goes through Resend. Screens will be
designed in Claude Design from a brief before they are built.

## Goal

A customer picks an open date, a package and their event details on bakarroast, submits, and
gets a reference with a status page; the owner sees the request in a new Bakar & Roast admin,
calls or WhatsApps the customer, then approves or declines. You confirm it works by booking a
date at `localhost:3200/catering/book`, seeing that date go unavailable, approving it in
`localhost:3200/admin`, and receiving the Resend emails.

## What this approval produces (Run 0, no app code)

Decision taken: "Plan + design brief". On approval I only write two files:

- `docs/bakar-roast-catering-plan.md`: this plan, so later runs read it from the repo.
- `docs/bakar-roast-design-brief.md`: the brief below, expanded, ready to paste into Claude Design.

Code is built in later runs, each started by you:

| Run | Scope | Needs the design? |
|---|---|---|
| 1 | Backend: remove Twilio, catering contract and API, Resend email | No, can start any time |
| 2 | Bakar & Roast public booking UI, story redesign, new dark admin (catering) | Yes |
| 3 | Move the 10 Bun Theory admin screens into the Bakar & Roast admin | Yes (admin shell from run 2) |

## Decisions (from your answers)

- One event per day. A pending request holds the date straight away.
- Customer picks a package, headcount and notes. No prices shown. Quote is agreed by call or WhatsApp.
- Booking rules, all owner-editable in admin settings: minimum notice (default 7 days),
  booking window (default 6 months), pending hold expiry (default 3 days), customer
  cancellation cutoff (default 7 days before the event).
- Owner manages packages, blocked dates, gallery and testimonials in the admin.
- Owner records quote, deposit and balance as paid. No online payment.
- Booking form also collects event address, serving time, occasion, dietary notes.
- Alerts: pending count badge in admin, Call and WhatsApp buttons (`wa.me` with a prefilled
  message, reusing `waLink` in `bakar-roast/lib/content.ts`), plus Resend emails.
- Admin: new dark Bakar & Roast admin, same login (`POST /auth/login`, `Admin` table).
  Catering first; Bun Theory screens move in run 3. Bun Theory admin keeps working until then.
- Twilio removed completely, including Bun Theory order messages and the admin phone setting.
- Story page: redesigned layout, same six chapters and copy.

## Frozen contract

### Prisma (`backend/prisma/schema.prisma`), migration `catering_bookings`

```prisma
enum CateringBookingStatus {
  PENDING
  APPROVED
  DECLINED
  CANCELLED
  EXPIRED
  COMPLETED
}

model CateringPackage {
  id          String   @id @default(cuid())
  name        String
  tagline     String?
  description String
  includes    String[]
  imageUrl    String?
  minGuests   Int      @default(10)
  maxGuests   Int?
  isActive    Boolean  @default(true)
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  bookings    CateringBooking[]
}

model CateringBooking {
  id            String                @id @default(cuid())
  /// Human reference shown to customer and owner, e.g. BR-7K2M9Q.
  reference     String                @unique
  /// Unguessable token for the public status page and cancel link.
  accessToken   String                @unique
  status        CateringBookingStatus @default(PENDING)
  /// Malaysia-local calendar date of the event. Never a timestamp.
  eventDate     DateTime              @db.Date
  /// Serving time as "HH:mm", Malaysia local.
  serviceTime   String
  packageId     String
  package       CateringPackage       @relation(fields: [packageId], references: [id])
  /// Snapshot so later package edits do not rewrite history.
  packageName   String
  guests        Int
  occasion      String
  customerName  String
  customerPhone String
  customerEmail String
  eventAddress  String
  dietaryNotes  String?
  notes         String?
  quoteAmount   Decimal?  @db.Decimal(10, 2)
  depositAmount Decimal?  @db.Decimal(10, 2)
  depositPaidAt DateTime?
  balancePaidAt DateTime?
  adminNotes    String?
  declineReason String?
  holdExpiresAt DateTime?
  decidedAt     DateTime?
  cancelledAt   DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  dateHold      CateringDate?

  @@index([status, eventDate])
  @@index([createdAt])
}

/// One row per unavailable date. The primary key is the no-double-booking guarantee.
/// bookingId set = held by a PENDING or APPROVED booking. bookingId null = blocked by owner.
model CateringDate {
  date        DateTime         @id @db.Date
  bookingId   String?          @unique
  booking     CateringBooking? @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  blockReason String?
  createdAt   DateTime         @default(now())
}

model CateringGalleryImage {
  id        String   @id @default(cuid())
  imageUrl  String
  caption   String?
  isActive  Boolean  @default(true)
  sortOrder Int      @default(0)
  createdAt DateTime @default(now())
}

model CateringTestimonial {
  id        String   @id @default(cuid())
  quote     String
  name      String
  role      String?
  isActive  Boolean  @default(true)
  sortOrder Int      @default(0)
  createdAt DateTime @default(now())
}
```

`SystemSettings` changes: drop `adminWhatsappNumber`; add
`cateringMinNoticeDays Int @default(7)`, `cateringBookingWindowMonths Int @default(6)`,
`cateringHoldExpiryDays Int @default(3)`, `cateringCancelCutoffDays Int @default(7)`,
`cateringNotifyEmail String?`.

State rules (service, high tier):
- Create: insert booking and its `CateringDate` row in one transaction. A unique violation
  (P2002) on `CateringDate.date` returns `409 DATE_TAKEN`. Reject dates outside
  [today + minNotice, today + window], guests outside the package range, inactive package.
  "Today" is computed in `Asia/Kuala_Lumpur`.
- Anti-squatting: at most 2 PENDING bookings per customer email or phone. A third returns
  `409 TOO_MANY_PENDING`. Without this one person could hold the whole calendar.
- PENDING → APPROVED (hold stays, `holdExpiresAt` cleared), DECLINED, CANCELLED, EXPIRED.
  APPROVED → CANCELLED, COMPLETED. Leaving PENDING/APPROVED for anything but COMPLETED
  deletes the `CateringDate` row in the same transaction.
- Customer cancel: allowed while PENDING or APPROVED and today ≤ eventDate − cancelCutoffDays.
  After the cutoff the status page says to contact the owner.
- Expiry is lazy: a `expireStale()` call at the start of availability, create, admin list and
  the public status read (so a customer never sees a hold dated yesterday)
  marks PENDING rows past `holdExpiresAt` as EXPIRED and frees the date. No cron.

### Endpoints (`backend/src/modules/catering/`)

| Method | Path | Guard / role | Request | Response |
|---|---|---|---|---|
| GET | `/catering/packages` | public | none | `CateringPackagePublic[]` (active, sorted) |
| GET | `/catering/availability` | public | `?from&to` (YYYY-MM-DD, max 12 months) | `{ minDate, maxDate, unavailable: string[] }`, dates only |
| POST | `/catering/bookings` | public, throttled 5/hour/IP, honeypot field | `CreateCateringBookingDto` | `{ reference, accessToken, status, eventDate, holdExpiresAt }` |
| GET | `/catering/bookings/:accessToken` | public | none | `CateringBookingPublic` (no admin notes, no money) plus `canCancel`, `cancelDeadline` |
| POST | `/catering/bookings/:accessToken/cancel` | public | none | `CateringBookingPublic` |
| GET | `/catering/gallery`, `/catering/testimonials` | public | none | active rows, sorted |
| GET | `/catering/admin/bookings` | Jwt | `?status&from&to&take≤200` | `CateringBookingAdmin[]` |
| GET | `/catering/admin/bookings/pending-count` | Jwt | none | `{ count }` |
| GET | `/catering/admin/bookings/:id` | Jwt | none | `CateringBookingAdmin` |
| PATCH | `/catering/admin/bookings/:id/approve` | Jwt + Roles OWNER, MANAGER | `{ quoteAmount?, depositAmount?, adminNotes? }` | `CateringBookingAdmin` |
| PATCH | `/catering/admin/bookings/:id/decline` | Jwt + Roles OWNER, MANAGER | `{ reason? }` | same |
| PATCH | `/catering/admin/bookings/:id/cancel`, `/complete` | Jwt + Roles OWNER, MANAGER | none | same |
| PATCH | `/catering/admin/bookings/:id` | Jwt + Roles OWNER, MANAGER | `{ quoteAmount?, depositAmount?, depositPaid?, balancePaid?, adminNotes? }` | same |
| GET / POST / DELETE | `/catering/admin/blocked-dates[/:date]` | Jwt (write: OWNER, MANAGER) | `{ date, reason? }` | `{ date, reason }[]`; POST on a held date returns 409 |
| GET / POST / PATCH / DELETE | `/catering/admin/packages[/:id]`, `/gallery[/:id]`, `/testimonials[/:id]` | Jwt (write: OWNER, MANAGER) | model fields | the row(s) |

`CreateCateringBookingDto`: `eventDate` (YYYY-MM-DD), `serviceTime` (HH:mm), `packageId`,
`guests` (int ≥ 1), `occasion`, `customerName`, `customerPhone`, `customerEmail` (IsEmail),
`eventAddress`, `dietaryNotes?`, `notes?`, all strings trimmed with max lengths.
Existing `GET/PATCH /settings` carries the five new catering fields. Image uploads reuse
`POST /uploads/image`. CORS: add `http://localhost:3200` and `http://127.0.0.1:3200` to
`DEFAULT_ORIGINS` in `backend/src/main.ts`.

### Email (`backend/src/modules/email/`, replaces `notifications/`)

`resend` package. `EmailService.send(to, subject, html)`; env `RESEND_API_KEY`, `EMAIL_FROM`,
`PUBLIC_SITE_URL`. Missing key means log and skip (same behaviour Twilio had). A failed send
never fails the booking. Methods U2 calls, each taking the booking row:
`bookingReceived`, `ownerNewRequest`, `bookingApproved`, `bookingDeclined`, `bookingCancelled`,
`bookingExpired`, `ownerCustomerCancelled`. Seven emails, catering only:

| Trigger | To | Content |
|---|---|---|
| Request submitted | owner (`cateringNotifyEmail`) | summary, customer phone, admin link |
| Request submitted | customer | reference, summary, status page link, hold expiry |
| Approved / Declined / Cancelled / Expired | customer | outcome, reference, status link |
| Cancelled by customer | owner | reference, freed date |

### Frontend types (`bakar-roast/lib/api.ts`)

`CateringPackagePublic`, `Availability`, `CateringBookingPublic`, `CateringBookingAdmin`,
`CateringBookingStatus`, mirroring the tables above, plus one `api<T>()` fetch helper copied
from `frontend/lib/api.ts` (reads `NEXT_PUBLIC_API_URL`, optional bearer token). Admin token
in `localStorage["admin_token"]`, same key the Bun Theory admin uses.

## Run 1 as built (2026-11-10): differences from the contract above

Run 1 (backend) is done. Where this section and the tables above disagree, this section and
the code win. Source of truth for shapes: `backend/src/modules/catering/catering.types.ts`,
mirrored in `bakar-roast/lib/api.ts`.

- **Settings:** rules are saved with `PATCH /settings/catering` (Jwt + OWNER, MANAGER,
  `UpdateCateringSettingsDto`), not a general `PATCH /settings`. Read them from
  `GET /settings/admin`. Returns `400 INVALID_RULES` when minimum notice is not shorter than
  the booking window (`notice >= months * 28`).
- **Admin calendar:** `GET /catering/admin/calendar?from&to` (both required, max 12 months)
  returns `CateringCalendarDay[]` with `kind` `PENDING | APPROVED | COMPLETED | BLOCKED`.
- **Extra error codes:** `INVALID_DATE` (400, impossible date), `TOO_MANY_PENDING` (409),
  `INVALID_STATE` (409), `CANCEL_WINDOW_CLOSED` (409), `EVENT_NOT_YET` (409, completing
  before the event date), `TRY_AGAIN` (409, practically unreachable), and `429` from the rate
  limit (5 booking POSTs per hour per IP, failed attempts count; 20 per hour for cancel).
- **Complete:** only on or after the event date (Malaysia time). COMPLETED keeps the date held.
- **Hold expiry:** the earlier of now + hold days and the end of the event day.
- **Emails** are sent in the background after the database commit; a slow or failed send never
  delays or fails a request.
- **Package delete:** returns `{ id }` when the package has no bookings; otherwise it is
  deactivated and the `CateringPackageAdmin` row comes back with `isActive: false`.
- **Phone:** needs at least 7 digits; stored as digits with an optional leading `+`.
  `+6012...` and `012...` count as different numbers for the 2-pending cap.
- **Frontend helper:** `api<T>()` in `bakar-roast/lib/api.ts` throws `ApiError` with `status`
  and `code`, so screens branch on `code` (for example `DATE_TAKEN` returns to the calendar).
- **Env:** `RESEND_API_KEY`, `EMAIL_FROM`, `PUBLIC_SITE_URL`, `TRUST_PROXY` in
  `backend/.env.example`; `NEXT_PUBLIC_API_URL` in `bakar-roast/.env.local.example`.
- **U4** (seed and docs) was done by the orchestrator. The seed adds 3 placeholder packages
  only when the package table is empty.
- Also removed with Twilio: storefront copy that promised WhatsApp updates now points to
  order tracking, and the unused `frontend/components/admin/phone-display-readonly.tsx`.

## Run 1b as built (2026-11-10): Better Auth 1.7.19

- **One login system.** Better Auth runs inside the backend at `/api/auth/*` on the tables
  `User`, `Session`, `Account`, `Verification`. Staff and customers share `User`; `role` is
  `CUSTOMER` or a staff role (`OWNER`, `MANAGER`, `KITCHEN`, `CASHIER`). The old `Admin` table
  is kept as an unused backup.
- **Staff.** `POST /auth/login` is unchanged for callers (`{ accessToken, admin }`) and now
  returns a Better Auth session token, sent as `Authorization: Bearer`. Existing passwords
  work (bcrypt). Staff can never sign in or reset by emailed code. Password and display-name
  changes: yourself, or an OWNER, or a MANAGER on a non-OWNER.
- **Customers.** Email code (`/api/auth/email-otp/send-verification-otp` then
  `/api/auth/sign-in/email-otp`) or email and password with a verified email. The site
  client is `bakar-roast/lib/auth-client.ts` (token in `localStorage["br_token"]`).
- **Guards:** `AdminAuthGuard` (staff only; a customer token gets 401), `CustomerAuthGuard`
  (any verified user), `OptionalAuthGuard` (never fails). There is no global guard.
- **Bookings:** `POST /catering/bookings` stores `userId` when a verified session is sent.
  `GET /catering/me/bookings` returns `CateringBookingMine[]` (public view plus `accessToken`
  and `customerPhone`): bookings with my `userId` or my verified email.
- **Limits:** booking POST 10 per hour and 12 per day per IP; cancel 20 per hour; staff login
  10 per minute; Better Auth sign-in 5 per minute and code sending 3 per minute.
  `ThrottlerModule` is registered once in `app.module.ts`; a new throttled route must add
  `@SkipThrottle({ day: true })` unless it wants the daily cap.
- **Settings:** public `GET /settings` includes the four catering rule numbers. Default
  cancellation cutoff is 3 days.
- **Owner emails** fall back to OWNER accounts when no notification email is set.
- **Env:** `BETTER_AUTH_SECRET` (required everywhere, the server will not start without it)
  and `BETTER_AUTH_URL`. `JWT_SECRET` is gone.
- **POS:** `weekend-grills-pos/lib/jwt-utils.ts` treats the new opaque token as not expired.

## Run 2 as built (2026-11-11): the Bakar & Roast site

Built from the Claude Design handoff in `bakar-roast-handoff/`. The app's own rules
(`bakar-roast/.cursor/rules/design.mdc`, `project.mdc`) document every component and route.

- **Design system:** `components/ui/` (19 components, Bricolage Grotesque + Figtree, dark ember
  palette). Every component in every state: `/dev/components` (noindex).
- **Public pages** (`components/sections/`): `/` (home and catering in one page; `/catering` redirects there), `/story`, `/menu`, `/contact`.
  Gallery and testimonials render only when the owner has added some.
- **Booking** (`components/booking/`): `/catering/book` (four steps, done screen),
  `/booking/[token]` (status, cancel). Draft kept in sessionStorage.
- **Customer account** (`components/account/`): `/account`, sign in by emailed code, "Your
  bookings". Optional everywhere. `?next=` is limited to `/catering/book` and `/booking/<token>`.
- **Owner admin** (`components/admin/`): `/admin` (Today), `/admin/requests[/id]`,
  `/admin/calendar`, `/admin/packages[/new|/id]`, `/admin/content`, `/admin/settings`. Token in
  `localStorage["br_admin_token"]`. Later Bun Theory screens join `components/admin/nav.ts`.
- **Motion:** preloader (first visit per session), two-panel page transition, cursor dot,
  magnetic buttons, photo trail, footer slide-out; all off under reduced motion and on the
  booking, status, account and admin routes.
- **Env:** `NEXT_PUBLIC_API_URL` (also decides which host may serve uploaded photos),
  optional `NEXT_PUBLIC_IMAGE_HOST` (photos on a CDN), `NEXT_PUBLIC_BUN_THEORY_URL`.

## Units

Run 1 (backend). Order: U1, then U3, then U2, then U4. Sequential, because U2 calls the email functions U3 writes and all three touch `app.module.ts` and `backend/package.json`.

| Unit | App | Files | Tier | Agent | Depends on |
|---|---|---|---|---|---|
| U1 Remove Twilio | backend, frontend, docs | delete `backend/src/modules/notifications/`; edit `app.module.ts`, `orders/orders.module.ts`, `orders/orders.service.ts` (5 notify calls at lines 413, 414, 549, 552, 555 and the injection), `settings/settings.service.ts` and `settings/dto/update-branding.dto.ts` (`adminWhatsappNumber`, the only other references besides the schema), `backend/package.json`, `backend/.env.example`, `frontend/app/admin/settings/page.tsx`, `frontend/components/admin/order-table.tsx`, `frontend/app/admin/orders/[id]/page.tsx` (toast copy), `README.md`, `docs/product.md`, `AGENTS.md` | medium: touches order flow but only deletes calls | `implementer-opus`: settings UI and copy edits are judgement | contract |
| U2 Catering service and controllers | backend | `backend/src/modules/catering/` (module, public controller, admin controller, service, DTOs), `app.module.ts`, `@nestjs/throttler` | high: date-hold concurrency, public unauthenticated POST, role guards, money fields | `implementer-opus-high` | contract, U3 |
| U3 Email module | backend | `backend/src/modules/email/` (module, service, templates), `.env.example` | medium: new pattern, no exact analog | `implementer-opus` | contract, U1 |
| U4 Docs and seed | backend, docs | `backend/src/database/seed.ts` (3 sample packages), `docs/product.md` catering section, `AGENTS.md` (port 3200, Resend env) | low | `implementer-sonnet`: content fully specified in the packet, mirrors existing seed entries | U2 |

Run 2 (Bakar & Roast UI, after the Claude Design output). All `implementer-opus` (UI is never Sonnet).

| Unit | Files | Depends on |
|---|---|---|
| U5 Booking flow | `app/catering/page.tsx`, `app/catering/book/page.tsx`, `app/booking/[token]/page.tsx`, `components/booking/*` (calendar, package picker, details form, review, success) | run 1, design |
| U6 Story, home, live gallery and testimonials | `app/story/page.tsx`, `app/page.tsx`, `components/testimonials.tsx`, `components/gallery-collage.tsx`, `lib/content.ts` | run 1, design |
| U7 Admin shell and login | `app/admin/layout.tsx`, `app/admin/login/page.tsx`, `components/admin/*` (sidebar with pending badge, auth guard) | design |
| U8 Admin catering screens | `app/admin/page.tsx` (requests), `bookings/[id]`, `calendar`, `packages`, `gallery`, `settings` | U7 |

Run 3: one unit per Bun Theory admin screen group, moved into the U7 shell and restyled dark;
then delete `frontend/app/admin` and `frontend/components/admin`. Planned in detail in
"Run 3 plan" at the end of this file.

## Orchestrator-owned work (run 1)

Schema edit, migration `catering_bookings` on the local DB (`backend/.env` points at
`localhost:5437`, confirmed), `npm run db:generate`, the DTO files, controller route
signatures, CORS origins, `bakar-roast/lib/api.ts` types, `bakar-roast/.env.local.example`
(`NEXT_PUBLIC_API_URL=http://localhost:3101`; the app has no env file today), installing
`resend` and `@nestjs/throttler`, and the `EmailService` method signatures below.

## Design brief for Claude Design (expanded into `docs/bakar-roast-design-brief.md`)

Brand: Bakar & Roast, "Fire. Feast. Family.", wood-fire catering in Petaling Jaya. Dark and
fiery: ink `#0B0908` / `#141010` / `#1C1614` / line `#2A211D`, cream `#F4ECE1` / `#C7B9A8` /
`#8A7C6E`, single ember accent `#E86A1C` (bright `#F59E0B`, heat `#C0341E`). Layout, type
(condensed Bricolage Grotesque headlines, Figtree body) and motion follow the Hearthwell
reference site, recoloured dark; see section 10 of the brief. Fonts and `globals.css`
button styles change in run 2. Copy is short and sensory, no em-dash elaborations. Phone first.

Screens to design, phone and desktop:

1. **Catering landing**: hero, occasions, package cards (photo, tagline, what is included, guest range, "Book this"), how it works (pick a date, choose a package, we call you, we cook), gallery, testimonials, "prefer to chat" WhatsApp fallback.
2. **Booking flow**, 4 steps with progress: (a) calendar month view, (b) package and headcount, (c) event and contact details, (d) review and submit. Then a success screen with the reference and "we will call you".
3. **Calendar day states**: available, selected, unavailable (held, booked and blocked look the same to customers), too soon, beyond window, today, other month. Also loading, the "this date was just taken" error, and the "you already have 2 requests waiting" error.
4. **Booking status page**: reference, timeline, status states PENDING (with hold expiry), APPROVED, DECLINED, CANCELLED, EXPIRED, COMPLETED; cancel button with confirm, and the "past the cancellation deadline, contact us" state.
5. **Story page**: founders John Zachariah and Grace Sheila, the six-chapter timeline (2020 to today), photo slots, closing call to action into booking.
6. **Admin (dark, plainer and denser than the public site)**: login; shell with sidebar and pending badge; requests list with status tabs and empty state; request detail (customer, event, package, Call and WhatsApp buttons, approve with quote and deposit, decline with reason, payment tracking, notes); calendar with held, booked and blocked dates and block-a-date action; packages list and editor; gallery and testimonials manager; settings (four rule numbers, notify email).
7. **Emails**: one simple dark-header template for the seven messages.

Form states to cover everywhere: empty, focus, invalid, submitting, success, server error.

## Verify strategy (runs 1 and 2)

- `npx tsc --noEmit` in `backend` and `bakar-roast`; `npm run lint` and `npx tsc --noEmit` in `frontend` (U1 touches it).
- `grep -ril twilio backend/src backend/package.json backend/.env.example frontend/app frontend/components frontend/lib README.md AGENTS.md docs/product.md` returns nothing (this plan and the brief mention the word, so `docs/` is not searched whole).
- `npx prisma migrate status` clean in `backend/`.
- curl flow: create package (admin) → `GET /catering/availability` → `POST /catering/bookings`
  → same date again returns 409 → two parallel POSTs for one date give exactly one 201 →
  approve → public status shows APPROVED → customer cancel inside and outside the cutoff →
  blocked date rejects booking → pending booking with a past `holdExpiresAt` expires and frees the date.
- Bun Theory smoke test: place an order and change its status with Twilio gone.
- Run 2: browser check at phone and desktop width on port 3200.

## Assumptions (chosen without you, say if any is wrong)

1. Customer cancellation applies to pending and approved bookings, up to the cutoff days before the event.
2. Resend emails are for catering only. Bun Theory orders collect no email, so they get no messages once Twilio is gone.
3. Customer email becomes a required booking field (needed for Resend).
4. Dropping `adminWhatsappNumber` deletes the one stored phone number. Not recoverable from the DB.
5. The WhatsApp enquiry form stays on `/contact` as the "just chatting" path; the home page (the catering page) links to the booking flow instead.
6. The home page stat counters (120+ events and so on) stay as editable content; you supply real numbers.
7. Resend needs a verified sending domain and an API key from you before emails actually send.
8. Added after approval: the 2-pending-requests cap per customer and expiry on the status read.
9. Out of scope: online payment, customer accounts, multiple events per day, automatic reminders.

## Run 3 plan: move the Bun Theory admin into the Bakar & Roast admin

Planned 2026-11-11 after run 2 was committed (`dd72167`). Not started.

### Decisions taken

1. The Bun Theory screens get their own group under `/admin/bun-theory/*`, listed below
   Catering in the side menu.
2. Roles are set later. For now every staff login sees the same menu, and access stays
   as it is today: the backend already limits catering screens to OWNER and MANAGER,
   and Bun Theory routes accept any staff login.
3. The storefront's `/admin/*` redirects to the Bakar & Roast admin. The old admin code and
   the packages only it used are deleted.
4. Staff management becomes one shared **Team** screen (`/admin/team`). The sidebar
   logo and name setting ("Company info") is dropped, because the admin is now Bakar & Roast
   branded. Payment QR, kitchen capacity, minimum delivery, ordering on/off and outlet stay in
   Bun Theory settings.

### Screens

| Old (`frontend/app/admin`) | New (`bakar-roast/app/admin`) |
|---|---|
| `dashboard` | `bun-theory` (overview) |
| `board` (Socket.io, sound on new order) | `bun-theory/board` |
| `orders`, `orders/[id]` | `bun-theory/orders`, `bun-theory/orders/[id]` |
| `payments` (receipts) | `bun-theory/receipts` |
| `batches` | `bun-theory/batches` |
| `menu` (editor and item dialog) | `bun-theory/menu` |
| `feedback` | `bun-theory/feedback` |
| `settings` (minus Company info and Admin access) | `bun-theory/settings` |
| `settings` Admin access | `team` |

### Backend change

- The `/orders` socket accepts anyone and sends every order, with the customer's name,
  phone number and address, to whoever connects. Require a staff session token in the
  connection handshake and limit allowed origins to the CORS list.
- Later, with roles: `@Roles` on Bun Theory routes, a role-filtered menu, who may change
  another staff member's password, and whether a MANAGER may create an OWNER.

### Units (one at a time)

| Unit | Work | Tier |
|---|---|---|
| R3-0 Contract (orchestrator) | Order, batch, menu, feedback and storefront-settings types plus calls in `bakar-roast/lib`, mirrored from `frontend/types` and `frontend/services`; the Bun Theory nav group in `components/admin/nav.ts`; install `socket.io-client` | — |
| R3-1 Socket auth | The backend change above | opus-high |
| R3-2 Shell | Bun Theory group in the menu and phone drawer, pending-orders badge | opus |
| R3-3 Orders and receipts | Orders list, order detail with receipt, receipts screen | opus |
| R3-4 Live board | Socket with token, new-order sound, status moves | opus-high (realtime) |
| R3-5 Batches | List, create, publish, close, reopen, delete | opus-high (capacity and batch rules) |
| R3-6 Menu | Editor, item dialog with option groups and image upload | opus |
| R3-7 Overview and feedback | Dashboard numbers, chart, top items, feedback list | opus |
| R3-8 Settings and Team | Bun Theory settings; the shared Team screen | opus |
| R3-9 Remove old admin (orchestrator) | Storefront redirect `/admin/:path*`, delete old admin files and the services, hooks and packages only it used | — |

### Verify

- `npx tsc --noEmit` in `backend`, `bakar-roast` and `frontend`, plus `npm run lint` in
  `frontend`.
- Live checks:
  - A socket connection without a token is refused.
  - A storefront order shows on the board in real time.
  - Opening and closing a batch changes whether the storefront takes orders.
- Browser: each new screen at phone and desktop width, no console errors. The old
  `localhost:3000/admin` redirects.
- `code-review` high on the run 3 changes, at most 3 cycles.

### Assumptions to confirm

1. The live board keeps its sound alert.
2. Each Bun Theory screen keeps the features it has today; the redesign changes how it
   looks, not what it does.

## Run 3 as built (2026-11-11)

All the Bun Theory admin screens now live in the Bakar & Roast admin. The storefront's
`/admin/*` redirects there.

- **Routes:**
  - Under `/admin/bun-theory`: overview, `board`, `orders`, `orders/[id]`, `receipts`,
    `batches`, `menu` (`new` and `[id]` editors), `feedback`, `settings`.
  - Shared staff management is at `/admin/team`.
  - The side menu has three groups, Catering, The Bun Theory and Staff, and is the same for
    every staff login. Roles come later.
- **Code:**
  - Calls are in `bakar-roast/lib/bun-theory-api.ts`, and pure helpers (money in cents,
    Malaysia time) in `lib/bun-theory.ts`.
  - Screens are in `components/admin/bun-theory/`, plus `components/admin/team-screen.tsx`.
  - The live board socket is `lib/use-orders-socket.ts`.
- **Backend:**
  - The `/orders` and `/pos` sockets need a staff session (`common/staff-socket.ts`). They
    only accept our own sites, and they re-check open connections every minute.
  - `pending-count` no longer counts completed or cancelled orders.
  - A Pay now receipt URL must be an `/uploads/` path or an https URL.
  - Clearing a menu item's description or image stores null.
- **Storefront:**
  - The old admin, its services and the admin-only helpers are deleted.
  - `next.config.mjs` redirects to `BAKAR_ROAST_URL`. Its uploads image host now follows
    `NEXT_PUBLIC_API_URL`; it was still on port 3001.
  - `frontend/hooks/use-orders-socket.ts` is unused and still to delete (with
    `socket.io-client`).
- **Behaviour changes, agreed with the owner:**
  - The order detail shows a full money breakdown, plus Call and WhatsApp buttons.
  - Batch times are entered in Malaysia time.
  - Settings save as you go.
  - Overview revenue leaves out cancelled orders.
- **Later:**
  - Roles: menu filtered by role, and `@Roles` on Bun Theory routes.
  - Who may change another person's password, and whether a manager may create an owner.
  - Pending-count is refreshed twice per status change on the board, which is minor.
