# Bakar & Roast: design brief for Claude Design

Paste this whole file into Claude Design. It describes an existing dark website that is
getting a catering booking flow, a redesigned story page and a new admin. Design every
screen at phone width (390) first, then desktop (1440).

## 1. The brand

- **Bakar & Roast**, a wood-fire food brand in Petaling Jaya, Kuala Lumpur. Tagline: **Fire. Feast. Family.**
- Founders: John Zachariah and Grace Sheila.
- Catering is the flagship. The brand also owns The Bun Theory (fried chicken burgers) and
  The Weekend Grill (apple-wood smoked roast chicken). These are a proven track record,
  never "experiments" or "side projects".
- Feeling: a wood-fire steakhouse crossed with a craft catering brand. Cinematic, moody, warm.

## 2. Visual system

Decision: Hearthwell's layout, type and motion (section 10), in Bakar & Roast's dark ember
colours. The palette below is already built and stays. Type, buttons and shapes change.

| Token | Values |
|---|---|
| Ink (surfaces) | `#0B0908` base, `#141010` soft, `#1C1614` raised, `#2A211D` lines |
| Cream (text) | `#F4ECE1` main, `#C7B9A8` muted, `#8A7C6E` faint. Never pure white. |
| Ember (the only accent) | `#E86A1C` main, `#F59E0B` bright, `#C0341E` heat (errors), `#FF8A3D` glow |
| Display type | Bricolage Grotesque, condensed (width 75 to 85), heavy, uppercase, line height 0.84, tracking -0.025em. Replaces Fraunces. One word per headline in ember. |
| Body and UI type | Figtree, 16 to 17px. Replaces DM Sans. Eyebrows: 13px uppercase, 0.16em tracking, ember dot in front. |
| Shape | Radii 16, 24 and 36px on cards and photos. Pills fully round. |
| Section rhythm | Full-width bands alternating ink `#0B0908` and raised charcoal `#1C1614`, with an occasional cream `#F4ECE1` band (ink text) for contrast, the way Hearthwell alternates cream and green. |
| Tinted panels | Package cards use ember, bright amber `#F59E0B` and cream panels where Hearthwell uses butter and blush. |
| Buttons | 56px pill, label left, round arrow chip right. Ember (primary), cream (on dark), ink (on cream). |
| Texture | Fixed film grain overlay, ember radial glows behind key sections |
| Decor | Spinning round stamp with circular text, tilted marquee ribbons. Drop the polaroids, tickets and scribbles. |
| Motion | The full set in section 10.3. |

Rules: ember is used sparingly, for emphasis and single words. No second accent hue (amber is ember's own bright step).
Every photo sits over an ember gradient so an empty slot still looks intentional. Photos
are placeholders for now; mark each slot with what the real photo should show.

## 3. Copy tone

Sparse, confident, sensory. Short lines. Write like a menu, not a brochure. Do not use the
"statement, then an em dash, then an elaboration" pattern; use separate sentences or a comma.
Existing lines to stay close to: "We bring the fire to you." "Tell us about your table."
"Four steps to a full table."

## 4. How booking works (so the screens make sense)

1. Customer opens the calendar and picks an open date. One event per day.
2. They choose a catering package and a headcount. No prices are shown anywhere.
3. They give event details (serving time, address, occasion, dietary notes) and contact
   details (name, phone, email).
4. They submit. The date is held for them at once. They get a reference like `BR-7K2M9Q`,
   an email, and a private status page.
5. The owner sees the request in the admin, usually phones or WhatsApps the customer to
   agree the menu and quote, then approves or declines.
6. If the owner does nothing for 3 days the hold expires and the date reopens.
7. The customer can cancel from the status page until 7 days before the event.

The numbers (7 days notice, 6 months ahead, 3 day hold, 7 day cancel cutoff) are settings
the owner can change, so show them as values, not hard-coded sentences.

## 5. Public screens

### 5.1 Catering landing `/catering`

- Hero: "We bring the fire to you." with one primary action, "Check a date".
- Occasions: house gatherings, celebrations, community and church, small corporate.
- **Package cards** (new, the centre of the page): photo, name, one-line tagline, "what is
  included" list, guest range (for example "20 to 80 guests"), "Book this" button. Design for
  3 packages, and show how 1 and 5 look. No prices; a small line says the quote is agreed by call.
- How it works, 4 steps: Pick a date. Choose a package. We call you. We cook.
- Gallery of past events and client testimonials (both managed by the owner, so design
  an empty state where the section simply does not appear).
- "Prefer to chat first?" block with the WhatsApp number `+60 14-685 6433`.

### 5.2 Booking flow `/catering/book`

Four steps with a visible progress indicator and a back action on every step. On desktop a
summary panel stays beside the steps; on phone it collapses into a sticky bar.

| Step | Content |
|---|---|
| 1. Date | Month calendar, next and previous month, legend. Selected date shown in words ("Saturday 12 December 2026"). |
| 2. Package | Package cards as selectable options, then a headcount stepper limited to the package's guest range. |
| 3. Details | Serving time, event address, occasion (House gathering, Celebration, Community or church, Corporate, Something else), dietary notes, anything else. Then name, phone, email. |
| 4. Review | Everything on one card, edit links per section, a line explaining "your date is held for 3 days while we confirm", submit button. |
| Done | Reference number large, "We will call you on 012…", link to the status page, a plain "Message us" link. |

**Calendar day states to design:**

| State | Meaning |
|---|---|
| Available | Can be picked |
| Selected | The customer's choice |
| Unavailable | Held, booked or blocked. Customers see one look for all three. |
| Too soon | Inside the minimum notice period |
| Beyond window | Further ahead than bookings are open |
| Today | Marker only |
| Other month | Leading and trailing days |

Also: calendar loading skeleton, a month with no open dates, and the error when someone
else takes the date between picking and submitting ("That date was just taken. Pick another.")
which returns the customer to step 1 with their other answers kept. And the error when the
customer already has 2 requests waiting ("You have 2 requests waiting on us. We will call
you about those first.") with links to their status pages' contact action.

### 5.3 Booking status page `/booking/[token]`

Reference, event summary and a short timeline. One design per status:

| Status | What the customer sees |
|---|---|
| Pending | "We have your request." Date held until a stated day. Cancel button. |
| Approved | "Your date is confirmed." Event summary. Cancel button if still before the cutoff. |
| Declined | A kind message, the owner's reason if given, action to pick another date. |
| Cancelled | Confirmation, action to book again. |
| Expired | "We could not confirm in time." Action to book again. |
| Completed | A thank you. |

Plus: cancel confirmation dialog, the "cancellation deadline has passed, contact us" state
with the WhatsApp action, and a not-found page for a bad link.

### 5.4 Story page `/story`

Same content, stronger layout. Founders block for John Zachariah and Grace Sheila, then
the timeline, then a closing call to action into booking.

| When | Chapter |
|---|---|
| 2020 | The first fire. John cooks through the pandemic, a home kitchen becomes a workshop. |
| 2024 | A Christmas table. One roast chicken for his church family becomes a calling. |
| 2024 | Bakar & Roast is born. A holiday catering run, a name, a co-founder. |
| Along the way | The Bun Theory. Fried chicken burgers sold around the neighbourhood. |
| Along the way | The Weekend Grill. Apple-wood smoked chicken, a weekend ritual. |
| Today | The fire comes to your table. Catering brings the whole craft to your gathering. |

### 5.5 Home page touch-ups

Catering card and hero action point at the booking flow. Gallery and testimonials sections
use the same owner-managed content as the catering page.

## 6. Admin screens `/admin`

Same palette and type, but plainer and denser: no grain, no parallax, no decor, smaller
type, tables and forms that are fast to scan. Used mostly on a phone by the owner, on a
laptop sometimes. Later the Bun Theory order screens move into this same shell, so the
sidebar needs room for more sections (Catering now; Orders, Menu, Batches, Payments later).

| Screen | Content |
|---|---|
| Login | Email, password, error state. |
| Shell | Sidebar (drawer on phone) with a pending-requests count badge, signed-in name, sign out. |
| Requests list | Tabs: Pending, Approved, Past, All. Row: reference, event date, customer, package, guests, status chip, time left on the hold. Empty state per tab. |
| Request detail | Customer block with **Call** and **WhatsApp** buttons. Event block. Package block. Actions: Approve (optional quote and deposit amounts), Decline (optional reason), Cancel, Mark completed. Payment block: quote, deposit, deposit paid toggle, balance paid toggle. Private notes. |
| Calendar | Month view showing held (pending), booked (approved) and blocked dates as three distinct looks. Tap a free date to block it with a reason; tap a blocked date to unblock; tap a booking to open it. |
| Packages | List with drag or arrow ordering and show or hide toggle. Editor: name, tagline, description, included items list, photo upload, minimum and maximum guests. |
| Gallery and testimonials | Photo grid with upload, caption, show or hide, order. Testimonial list with quote, name, role, show or hide. |
| Settings | Minimum notice days, booking window months, hold expiry days, cancellation cutoff days, notification email. |

Status chip colours must stay inside the palette: use ember, cream and ink weights plus
icons or labels to tell statuses apart, not new hues.

## 7. Emails

One simple template, dark header with the wordmark, cream body, one ember button.
Seven messages: request received (customer), new request (owner), approved, declined,
cancelled, expired, and customer cancelled (owner).

## 8. States to cover on every form and list

Empty, focus, filled, invalid with message, submitting, success, server error, loading
skeleton, and nothing-to-show.

## 9. Accessibility

Cream on ink passes contrast; check ember text on ink at small sizes. Calendar days must be
distinguishable without colour alone (strike, dot or pattern). Tap targets at least 44px.
Visible focus rings in ember. Calendar is keyboard navigable.

## 10. Reference site: Hearthwell Bakery

Reference: `https://hearthwell-bakery-site.webflow.io/` (home, Our Story, Products, product
detail, Recipes, Contact, Style Guide). Use it for layout, type scale, components and
motion. Do not reuse its logo, photos, copy or name. Everything below was read from the
live pages and their stylesheet and animation script.

### 10.1 What it looks like

| Thing | Hearthwell value (colours are for reference only, use the section 2 palette) |
|---|---|
| Palette | Cream `#F5EFE4` / `#EBE1CF` / `#E0D3BC`, deep green `#17332A` / `#21463A` / `#2D5A4A`, ink `#1B1A16`, tomato accent `#E0532F` / `#C8421F`, butter `#F2C66A`, blush `#F1C6B4` |
| Section rhythm | Full-width bands that alternate cream and deep green. One accent word per headline in tomato. |
| Display type | Bricolage Grotesque, condensed (width 75 to 85), heavy, uppercase, line height 0.84, tracking -0.025em. Hero is `clamp(64px, 12.4vw, 210px)`. |
| Body type | Figtree, 16 to 17px. Eyebrow: 13px, 600, uppercase, 0.16em tracking, with a small accent dot before it. |
| Radii | 16, 24 and 36px on cards and photos. Pills and buttons fully round. |
| Buttons | 56px tall pill, label on the left, a round icon chip with a diagonal arrow on the right. Ink, accent and light variants. |
| Spacing | Section padding 176px desktop down to 88px phone. Gutter 56px down to 18px. |

### 10.2 Layout patterns to borrow, and where they go

| Hearthwell pattern | Use it for |
|---|---|
| Hero: three stacked giant lines, last one in the accent colour, short paragraph and button at the right, wide rounded photo below with two status chips on it and a spinning round stamp | Home and catering hero. Chips: "Now booking" and the next open date. |
| Two crossed, tilted marquee ribbons | Between hero and intro: "Wood fire", "Apple-wood smoke", "Cooked fresh", "Served warm" |
| "Who we are" paragraph in large type with small pill-shaped photos set inside the sentence | Home intro and the top of the story page |
| Three numbered step cards, stepped down like a staircase | How booking works: pick a date, choose a package, we call you, we cook |
| Big stacked cards, photo left and tinted panel right with a number, title, two-column item list and button | **Catering packages.** Item list is "what is included". Button is "Book this". |
| Numbered list rows with huge titles and a round arrow | Occasions we cater, or the menu list |
| Four big numbers with a small superscript unit | Events catered, guests fed, rating |
| Sideways-scrolling row of tilted photo cards with a progress line | Gallery of past events |
| Story block: big photo with a small photo overlapping its corner, heading, two paragraphs, button | Home "our story" teaser |
| Story page: headline, wide photo, big paragraph, timeline with a drawn line, dots, large year in butter, photo per chapter | Story page, six chapters |
| Numbered values list (number, bold title, one line) | "What we stand for" on the story page |
| Rounded photo band with centred headline and one button | Closing "Check a date" call to action on every page |
| Filter pills, product detail with option pills, three small stat tiles, accordion rows, tinted tip card | Booking flow: occasion pills, package option tiles, FAQ accordion, "good to know" tip card |
| Contact page: info blocks, soft filled fields with 16px radius, "Good to know" accordion | Booking details step and contact page |
| Footer: link columns, then the brand name set edge to edge in giant letters | Footer with "BAKAR & ROAST" |
| Phone: round burger button, menu opens as a full-screen panel with numbered links | Mobile nav |

### 10.3 Motion and interaction (build all of it, in this spirit)

Shared feel: 0.8s on almost everything, ease `expo.out` for entrances, `expo.inOut`
(`cubic-bezier(.76, 0, .24, 1)`) for wipes and panels, 0.05 to 0.1s stagger.

| Effect | How it behaves |
|---|---|
| Preloader, first visit only | Word plus a counter running 00 to 100 over 2.6s, a stack of photos wiping in one after another, the last photo scales up to fill the screen, then the whole loader wipes upward |
| Page transition | Two coloured panels slide up over the page with the destination's name, then slide away on the new page |
| Hero entrance | Headline letters rise from below and rotate up one by one (0.025s apart), header drops in, paragraph and button fade up, hero photo settles from 1.35x zoom |
| Hero on scroll | Photo starts inset with rounded corners and grows to full bleed. Headline drifts up slower than the page. |
| Section headlines | Words slide up from behind a mask with a slight tilt, 0.05s apart |
| Scrubbed paragraph | Words go from 14% to full opacity as you scroll through it. Inline pill photos grow from zero width. |
| General reveal | Blocks fade up 50px, batched with 0.1s stagger |
| Photo reveal | Wipes open from the bottom while the photo inside settles from 1.4x |
| Photo parallax | Photo drifts 8% against the scroll inside its frame |
| Marquees | Loop forever, speed up with scroll speed and reverse when you scroll the other way. The two ribbons change tilt as you scroll past. |
| Step cards | Rise in from further down the later they are in the row |
| Stacked cards | Each card sticks, then shrinks to 88%, tilts 1.5 degrees and dims as the next card slides over it. Its photo settles from 1.3x and its list items slide in from the right. |
| List rows | A photo follows the cursor, swaps per row, and tilts with how fast you move |
| Hover photo trail | Moving across a section drops small tilted photos along the cursor path that fade and fall |
| Counters | Count up from zero once, when first seen |
| Sideways gallery (desktop) | Section pins and vertical scroll moves the row sideways. Cards lean with scroll speed. A progress line fills. Plain swipe row on phone. |
| Timeline | The line draws downward as you scroll. Each year slides in from the left. |
| Call-to-action band | Grows from an inset rounded shape to full size while its photo settles from 1.3x |
| Footer | Slides out from under the page. Giant brand letters rise one by one. |
| Header | Hides when scrolling down, returns when scrolling up, gets a solid backing after 50px |
| Buttons | Pulled toward the cursor with a springy snap back. Arrow chip animates on hover. |
| Cursor | Small accent dot that follows the pointer and grows into a labelled circle ("View") over cards |
| Filters and option pills | Old items drop out fast (0.35s), matching items rise in staggered |
| Gallery thumbnails | New photo wipes in from the right while settling from 1.2x |
| Accordion | Height animates over 0.6s, plus turns to a cross |
| Mobile menu | Wipes down from the top over 0.9s |
| Spinning stamp | Round badge with circular text, one turn every 16s |

Rules that come with it: every effect switches off under reduced motion, and cursor,
magnetic, trail and hover-photo effects run only on devices with a fine pointer. The
booking calendar, forms and the admin stay calm: fades and short slides only.

Build note: `bakar-roast` already has `motion` and `lenis`. All of the above is built with
those (scroll-linked transforms, sticky sections). Do not add GSAP.

## 11. Addendum (added after the first brief was sent)

Paste this section into Claude Design as a follow-up. It adds customer accounts and four
states the backend now has.

### 11.1 Customer accounts (optional, guests can still book)

Customers can book without an account. Signing in gives them one place to see every booking
made under their email.

| Screen | Content |
|---|---|
| Sign in, step 1 | One field: email. Primary button "Email me a code". Text link "Use a password instead". |
| Sign in, step 2 | Six-digit code input (six boxes, auto-advance, paste fills all). "Code sent to name@email.com". Resend link with a 60 second countdown. States: wrong code, expired code, too many tries. |
| Sign in with password | Email and password, "Forgot password?" (which sends a code and then asks for a new password). |
| Create account | Name, email, password (minimum 8 characters), then the same six-digit code step to confirm the email. |
| My bookings | List of the customer's bookings, newest first: reference, event date, package, guests, status chip. Each row opens the booking status page. Empty state: "No bookings yet" with a "Check a date" button. Loading skeleton. |
| Nav, signed out | A quiet "Sign in" link beside the main "Check a date" button. |
| Nav, signed in | The customer's first name or initial in a small round chip; menu with "My bookings" and "Sign out". On phone these sit inside the full-screen menu. |
| Booking flow, signed in | Step 3 (details) pre-fills name and email, and shows "Booking as name@email.com". |
| Booking success, signed out | A soft prompt: "Create an account to keep track of this booking" with the email already filled in. Not a blocker. |

Staff do not use these screens. The admin keeps its own email and password login.

### 11.2 States the backend added

| Where | State to design |
|---|---|
| Booking form | "Too many attempts. Try again in a little while." (rate limit) |
| Booking form | "You have 2 requests waiting on us. We will call you about those first." |
| Admin calendar | A fourth look for **completed** events, next to pending, approved and blocked |
| Admin request detail | "Mark completed" is disabled until the event date, with a short hint saying why |
| Admin settings | Error under the rules: "Minimum notice must be shorter than the booking window." |
