# Screens

Which components make each screen. Design at 390 first, then 1440.

## How booking works

1. The customer opens the calendar and picks an open date. One event per day.
2. They choose a package and a headcount. No prices.
3. They give event details and contact details.
4. They submit. The date is held at once. They get a reference like `BR-7K2M9Q`, an email and a private status page.
5. The owner sees the request, usually phones or WhatsApps to agree the menu and quote, then approves or declines.
6. If the owner does nothing for the hold period (3 days), the hold expires and the date reopens.
7. The customer can cancel from the status page until the cutoff (7 days before the event).

## Public

| Screen | Build from, top to bottom |
|---|---|
| Catering `/catering` | Header. Hero: Headline "We bring the fire to you." with one Button "Check a date", wide PhotoSlot with two chips and the Stamp. Marquee. ListRow for occasions. PackageCard stack. StepCard row. Stat row. Gallery (sideways row of tilted PhotoSlots with a progress line) and Testimonials, each absent when empty. "Prefer to chat first?" block with the WhatsApp number. CtaBand. Footer. |
| Booking `/catering/book` | Header (static). BookingProgress with back. Step 1 Calendar. Step 2 PackageCard as options, then GuestStepper. Step 3 Fields and occasion Pills, with Accordion and tip card beside on desktop. Step 4 review card. BookingSummary beside on desktop, sticky bar on phone. Done screen with the reference. |
| Status `/booking/[token]` | StatusTimeline, one design per status: pending, approved, declined, cancelled, expired, completed. Dialog for cancel. Deadline-passed state with WhatsApp. Not-found page. |
| Story `/story` | Headline, wide PhotoSlot, large `lead` paragraph with inline pill photos. Founders block for John Zachariah and Grace Sheila (two PhotoSlots, names, one line each). Timeline with six chapters. Numbered values list "What we stand for". CtaBand into booking. |
| Home | Same hero pattern. Catering card and hero action point at `/catering/book`. Gallery and testimonials use the same owner-managed content as the catering page. Story teaser: big photo with a small photo overlapping its corner, heading, two paragraphs, button. |

## Customer account `/account`

Signing in is optional. Booking never requires it, and the private status link from the email keeps working without it.

| Screen | Build from |
|---|---|
| Sign in | Headline "Find your table.", one email Field, Button "Send me a code". No password: we email a 6-digit code. |
| Enter code | Headline "Check your email.", one code Field (numeric, one-time-code autofill), Button "Sign in", ghost Button "Use a different email". Error Banner "Enter the 6 digits from the email." |
| My bookings | Eyebrow "Signed in as" plus the email. One card per booking made with that email: reference, date in words, package and guests, StatusChip. Each opens its status page. Empty state "No bookings under this email yet." Button "Check a date", ghost Button "Sign out". |

- Bookings are matched by email, so earlier guest bookings appear as soon as the customer signs in.
- Signed in, booking step 3 is prefilled with name, phone and email, and says "Signed in as" above the contact fields.
- The done screen offers sign-in to guests ("Want every booking in one place?") and confirms "Saved to your bookings." to signed-in customers.
- The status page shows "All my bookings" as its back action when signed in.
- The header link reads "My bookings".

## Booking errors

- Date taken between picking and submitting: error Banner, back to step 1, other answers kept.
- Already 2 requests waiting: error Banner with links to each status page's contact action.
- Calendar loading: skeleton grid. Month with no open dates: grid plus one line and the next-month action.

## Admin `/admin`

| Screen | Build from |
|---|---|
| Login | Wordmark, two Fields, one Button, error Banner. |
| Shell | AdminShell: sidebar or drawer, pending badge, signed-in name, sign out. |
| Requests list | RequestList with tabs Pending, Approved, Past, All. |
| Request detail | Customer block with Call and WhatsApp. Event block. Package block. Actions: Approve (optional quote and deposit), Decline (optional reason), Cancel, Mark completed, each through a Dialog. Payment block: quote, deposit, two Toggles. Private notes Field. |
| Calendar | Calendar in admin mode: held, booked and blocked as three looks. Tap free to block with a reason, tap blocked to unblock, tap a booking to open it. |
| Packages | List with drag or arrow ordering and a show or hide Toggle. Editor: name, tagline, description, included items list, photo upload into a PhotoSlot, minimum and maximum guests. |
| Gallery and testimonials | Photo grid with upload, caption, show or hide, order. Testimonial list with quote, name, role, show or hide. |
| Settings | Minimum notice days, booking window months, hold expiry days, cancellation cutoff days, notification email. |

### Admin layout rules

- Brand level: the admin stays plain and dense, but page titles, tile numbers, date blocks and the payment headline use the display face. Ember marks only what needs action. No grain, glows, photos or motion beyond short slides.
- Laptop: fixed sidebar, 256px, with a line icon per section and the signed-in owner at the bottom.
- Phone: a sticky top bar with the page title and pending badge, and a bottom tab bar with Today, Requests, Calendar and More. More opens the full menu as a drawer. On a request, the tab bar is replaced by a sticky action bar (Approve, Decline, Cancel) and the top bar shows a back button, the reference and the status.
- **Today** is the first screen: a greeting with one sentence on what is waiting, four tiles (waiting on you, holds ending in 24h, events this week, deposits to collect), then "Needs you now" (pending requests, soonest hold first, each with Call and Approve) beside "Next 7 days" (approved events with time, guests, address and payment state).
- A tile that needs action gets an `ember` outline and an `ember` number.
- Date block: weekday, day number in the display face, month. Use it wherever a booking is listed.
- Requests has a search box (name, reference, phone, email, package) and a sort (by event date, newest request first) above the tabs. Tabs show a count each; Pending uses the `ember` badge.
- Requests table columns: event (date block and time), customer (name and reference), package (name and guests), status, hold, payment. On phone each request is a card.
- Request detail leads with the date block and the customer's name, then a "next step" bar: one sentence saying what to do and the actions for that status. Below it, two columns on laptop: customer, event, package and notes on the left; payment and an activity log on the right. One column on phone, same order.
- Payment shows one headline worked out from the numbers: "No quote yet", "RM 1,000 deposit due", "RM 4,700 balance due" or "Paid in full". Balance is quote minus deposit. It updates as the owner types or flips a toggle.
- Calendar has Month and List views. Month sits beside a "month at a glance" list of that month's holds, bookings and blocked dates with their reasons, and changes month on swipe. List shows everything from today on, grouped by month.
- Packages list shows a thumbnail, name, range and item count per row, with order arrows, a show toggle and Edit. Hidden rows are dimmed. The editor is its own screen with Save, Discard and Delete.
- Gallery cards hold the photo, caption, order arrows, show toggle and Remove. Testimonials are edited in place.
- Settings is one short page with no Save button. Each booking rule is a plain question ("How much notice do you need?") with a minus and plus control and one line showing what it means today ("Today the first day a customer can book is Tuesday 17 November."). Changes save as they are made and confirm with one quiet line. The alert email sits below and saves when the owner leaves the field.
- Settings warns when the cancellation cutoff is not lower than the minimum notice, because the earliest bookings then cannot be cancelled online.
- Every removal and status change that cannot be undone goes through a Dialog.

## States on every form and list

Empty, focus, filled, invalid with message, submitting, success, server error, loading skeleton, nothing to show. Field and Banner cover all of them.
