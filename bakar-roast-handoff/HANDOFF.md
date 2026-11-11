# Bakar & Roast: build handoff

You are building the catering booking flow, the redesigned story page, customer accounts and the owner admin for the existing `bakar-roast` website. The design is finished. This folder holds everything you need. Read it before writing code.

## What is in this folder

| Path | What it is | How to use it |
|---|---|---|
| `design-system/README.md` | The brand book: voice, colour, type, shape, accessibility, iconography | Read first. Its rules name the tokens to use. |
| `design-system/tokens.json` | Every colour, type style, spacing step, radius and shadow | The source of truth for values. `tokens.css` is the same values as CSS variables. |
| `design-system/screens.md` | Every screen, what it is built from, and the admin layout rules | Your screen-by-screen spec. |
| `design-system/motion.md` | Every motion effect with timings and easings | Build with `motion` and `lenis`, which the repo already has. Do not add GSAP. |
| `design-system/components/<Name>/README.md` | Guidelines per component (29 of them) | Read a component's README before building it. |
| `design-system/components/<Name>/preview.html` | Static markup for each component | Reference markup and states. They need `tokens.css` and `components/bundle.css` loaded to render. |
| `design-system/components/bundle.css` | Reference CSS for all components | Port the values and structure into the repo's own styling approach. Do not ship it as is. |
| `prototype/index.html` | A working single-file prototype of the whole site | Open it in a browser. It is the reference for layout, copy, states and behaviour. |

Online copies (private to the owner, may not open for you):
- Design system: https://claude.ai/artifact/LCiqtyx45ndxR9Phj9Pcxs
- Prototype: https://claude.ai/artifact/Dwwxj94TkGmivnuV9tNP2H

## How to treat the prototype

The prototype is a design reference, not code to copy. It is one HTML file with vanilla JavaScript and in-memory fake data that resets on reload. Rebuild every screen in the repo's own framework, components and conventions. Match its layout, wording, states and behaviour.

Routes in the prototype map to real routes like this:

| Prototype | Real route |
|---|---|
| `#catering` | `/catering` (and the home page touch-ups) |
| `#book` | `/catering/book` |
| `#status` | `/booking/[token]` |
| `#account` | `/account` |
| `#story` | `/story` |
| `#admin` | `/admin` and its sub-routes |

In the prototype's admin, any password signs in. On the status and account pages, dashed "Prototype" boxes are demo controls and must not be built.

## What to build

### Public
1. **Catering landing** `/catering`: hero, marquee, intro, occasions, package cards, four steps, stats, gallery, testimonials, WhatsApp block, closing band, footer.
2. **Booking flow** `/catering/book`: four steps (Date, Package, Details, Review) plus the done screen, with the summary panel on desktop and the sticky bar on phone.
3. **Booking status** `/booking/[token]`: one design per status (pending, approved, declined, cancelled, expired, completed), the cancel dialog, the deadline-passed state and the not-found page.
4. **Customer account** `/account`: optional sign-in by emailed 6-digit code, then a "My bookings" list.
5. **Story** `/story`: founders, six-chapter timeline, values, closing band.
6. **Home touch-ups**: catering card and hero action point at the booking flow; gallery and testimonials share the owner-managed content.

### Admin `/admin`
Login, shell, Today, Requests list, Request detail, Calendar (month and list), Packages (list and editor), Gallery and testimonials, Settings. The layout rules are in `design-system/screens.md` under "Admin layout rules".

### Emails
One template, seven messages. See `design-system/components/Email/README.md`.

## Booking rules

1. One event per day. A date is unavailable to customers if it has a pending or approved request, or the owner blocked it.
2. Submitting a request holds the date at once and creates a reference like `BR-7K2M9Q` plus a private status token.
3. The owner approves or declines. If nothing happens within the hold period, the request expires and the date reopens.
4. The customer can cancel from the status page until the cancellation cutoff.
5. A customer with 2 pending requests cannot submit a third.
6. If the date is taken between picking and submitting, return the customer to step 1 with every other answer kept.
7. No prices are shown to customers anywhere. Quote and deposit exist only in the admin.

Four numbers are owner settings and must never be hard-coded in copy: minimum notice (default 7 days), booking window (6 months), hold expiry (3 days), cancellation cutoff (7 days). Enforce all four on the server, not only in the UI. The date-taken check and the hold must be safe against two people submitting at the same moment.

Statuses: `pending`, `approved`, `declined`, `cancelled`, `expired`, `completed`.

## Data the build needs

A starting point. Fit it to the repo's existing database and naming.

- **Booking request**: reference, status token, event date, package, guests, serving time, address, occasion, dietary notes, extra notes, customer name, phone, email, status, decline reason, quote, deposit, deposit paid, balance paid, private notes, created at, hold expires at.
- **Request activity**: request, text, time. Shown as the activity log in the admin.
- **Package**: name, tagline, description, included items (ordered list), photo, minimum guests, maximum guests, sort order, shown. Deleting a package must not break old requests.
- **Blocked date**: date, reason.
- **Gallery photo**: image, caption, sort order, shown.
- **Testimonial**: quote, name, role, shown.
- **Settings**: the four numbers and the notification email.
- **Customer sign-in**: email, one-time code, expiry. Bookings are matched to a customer by email, so earlier guest bookings appear once they sign in.

Payment headline in the admin: balance is quote minus deposit. The wording cases are in `screens.md`.

## Design rules that are easy to get wrong

- Labels on ember, amber and cream fills are ink (`#0B0908`), never cream.
- On cream bands the accent word uses heat red, not ember.
- Error wording is cream with a heat-red border and icon. Heat red is never small text.
- Form fields get a faint-cream border. The hairline colour is decorative only.
- Statuses and calendar days must differ by shape, pattern or icon as well as colour.
- Bricolage Grotesque must be loaded with the `wdth` axis and set at width 80, weight 800, uppercase.
- The footer brand name is shown whole and scaled to the content width. The typeface has an optical-size axis, so measure and scale more than once.
- Admin: display face only on page titles, tile numbers, date blocks and the payment headline. No grain, glows or parallax.
- Every motion effect is off under reduced motion. Cursor and hover-photo effects run only on fine pointers. Booking, account, status and admin use fades and short slides only.
- Tap targets are at least 44px. Focus rings are 3px ember (ink on cream bands).

## Not designed or decided yet

Raise these with the owner rather than guessing.

- **Real content**: package names, included items, founder lines, values, intro paragraph and testimonials in the prototype are draft or sample copy. Photos are labelled placeholders.
- **Logo and icons**: no logo file or icon set was supplied. The wordmark is set in type and the icons are simple stand-ins. Pick one line icon set.
- **Motion not in the prototype**: preloader, page transitions, cursor dot, magnetic buttons, hover photo trail and the pinned sideways gallery are specified in `motion.md` but not demonstrated.
- **Sign-in method**: emailed codes were chosen over passwords. Confirm the email provider and that delivery is reliable.
- **Notice versus cutoff**: with both at 7 days, a customer who books the earliest date can never cancel online. The admin warns about this. Confirm the defaults.
- **Photo uploads**: the prototype's upload buttons do nothing. Storage, size limits and cropping are open.
- **Admin sign-in**: who the owner accounts are and how they are created.
- **Later**: The Bun Theory order screens (Orders, Menu, Batches, Payments) will move into the same admin shell. Leave room in the navigation; do not build them now.
- **WhatsApp message templates**: deliberately left out for now.

## Suggested order

1. Tokens, fonts and base components in the repo's styling system.
2. Database, settings and the booking rules on the server, with tests for holds, expiry, cutoff and double submission.
3. Catering landing and story page.
4. Booking flow and status page.
5. Emails.
6. Admin: login and shell, Today, Requests and detail, Calendar, Packages, Gallery and testimonials, Settings.
7. Customer account.
8. Motion pass, then accessibility and phone checks at 390 and 1440.

Before starting, read the existing `bakar-roast` code to learn its framework, routing, styling and data layer, and follow them. The existing palette there already matches `tokens.json`.
