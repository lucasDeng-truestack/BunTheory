// All site copy and photo slots live here so content is easy to edit.
// Photos are placeholders: each `photo` string says what the real photo should show and
// becomes its alt text once it lands. Every photo sits over the ember gradient, so an
// empty slot still looks intentional.

import type { CateringRules } from "./catering-api";

export const brand = {
  name: "Bakar & Roast",
  tagline: "Fire. Feast. Family.",
  location: "Petaling Jaya, Kuala Lumpur",
  whatsappNumber: "60146856433",
  whatsappDisplay: "+60 14-685 6433",
  instagram: "bakar.roast",
  instagramUrl: "https://instagram.com/bakar.roast",
  bunTheoryUrl: process.env.NEXT_PUBLIC_BUN_THEORY_URL || "http://localhost:3000",
};

export function waLink(message?: string) {
  const base = `https://wa.me/${brand.whatsappNumber}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

// Header and phone menu, in this order. The wordmark links home.
export const nav = [
  { label: "Packages", href: "/#packages" },
  { label: "Menu", href: "/menu" },
  { label: "Story", href: "/story" },
  { label: "Contact", href: "/contact" },
  { label: "My bookings", href: "/account" },
];

/** Used only when the settings call fails. The owner's real numbers always come from the API. */
export const fallbackRules: CateringRules = {
  cateringMinNoticeDays: 7,
  cateringBookingWindowMonths: 6,
  cateringHoldExpiryDays: 3,
  cateringCancelCutoffDays: 3,
};

export const bookCta = { label: "Check a date", href: "/catering/book" };

export const footerColumns: {
  title: string;
  links: { label: string; href: string; external?: boolean }[];
}[] = [
  {
    title: "Catering",
    links: [
      { label: "Packages", href: "/#packages" },
      { label: "Check a date", href: "/catering/book" },
      { label: "My bookings", href: "/account" },
    ],
  },
  {
    title: "The fire",
    links: [
      { label: "Our story", href: "/story" },
      { label: "Menu", href: "/menu" },
      { label: "The Bun Theory", href: brand.bunTheoryUrl, external: true },
    ],
  },
  {
    title: "Talk to us",
    links: [
      // Non-breaking so the number never splits across lines in a narrow column.
      {
        label: `WhatsApp ${brand.whatsappDisplay.replace(/-/g, "\u2011").replace(/ /g, "\u00a0")}`,
        href: waLink(),
        external: true,
      },
      { label: "Contact", href: "/contact" },
    ],
  },
];

// Inline "pill photo" inside a scrubbed lead paragraph. `note` says what the real photo shows.
export type LeadPart = string | { photo: string };

// Hero lines: three short lines, the accent word wrapped in *stars*.
export type HeroCopy = {
  eyebrow: string;
  lines: string[];
  body?: string;
  photo?: string;
};

// ─── Catering ────────────────────────────────────────────────────────────────

export const cateringHero: HeroCopy = {
  eyebrow: "Wood-fire catering, Petaling Jaya",
  lines: ["We bring", "the fire", "*to you.*"],
  body: "Whole chickens over apple wood. Sides off the coals. Cooked at your place, served warm.",
  photo: "Photo: whole chickens over the wood fire, embers glowing, shot wide at dusk.",
};

// DRAFT copy from the prototype. The owner to confirm or rewrite.
export const cateringIntro: { eyebrow: string; lead: LeadPart[] } = {
  eyebrow: "Who we are",
  lead: [
    "We are John and Grace. We cook over wood",
    { photo: "Photo: embers under a whole chicken." },
    "the slow way. Apple-wood smoke, live coals, whole birds turned by hand",
    { photo: "Photo: hands turning a bird on the spit." },
    "until the skin snaps. Then we carry all of it to your table and feed the people you love.",
  ],
};

// `occasion` must match the booking form's occasion values (eventTypes below).
export const cateringOccasions = [
  { title: "House gatherings", occasion: "House gathering", photo: "Photo: a house party table, family reaching in." },
  { title: "Celebrations", occasion: "Celebration", photo: "Photo: a birthday table, mid-toast." },
  { title: "Community and church", occasion: "Community or church", photo: "Photo: a church hall buffet line." },
  { title: "Small corporate", occasion: "Corporate", photo: "Photo: a team lunch, platters down the middle." },
];

export const cateringSteps = [
  { title: "Pick a date", line: "Open the calendar. One event a day." },
  { title: "Choose a package", line: "Tell us how many are coming." },
  { title: "We call you", line: "We agree the menu and the quote." },
  { title: "We cook", line: "Fire lit. Food served warm." },
];

/** The four fact stats. The booking window comes from the owner settings. */
export const cateringStats = (windowMonths: number) => [
  { value: 2020, unit: "since", label: "Cooking over fire", group: false },
  { value: 1, unit: "a day", label: "One event, our full attention" },
  { value: 3, unit: "kitchens", label: "Catering, The Bun Theory, The Weekend Grill" },
  { value: windowMonths, unit: "months", label: "How far ahead you can book" },
];

export const packagesCopy = {
  eyebrow: "Packages",
  quote: "No price list. We agree the quote with you by call.",
  failed: "We could not load the packages just now. Message us and we will talk you through them.",
};

export const pastTablesCopy = {
  eyebrow: "Past tables",
  galleryHeadline: "Seen at the *fire.*",
  // Shown only when there are testimonials but no gallery photos.
  quotesHeadline: "Heard at the *table.*",
};

export const chatCopy = {
  eyebrow: "Prefer to chat first?",
  headline: "Message *us.*",
  body: "Ask about dates, menus or anything else. We answer on WhatsApp.",
  action: "Open WhatsApp",
};

// ─── Home ────────────────────────────────────────────────────────────────────

export const homeHero: HeroCopy = {
  eyebrow: "Wood-fire kitchen, Petaling Jaya",
  lines: ["Fire.", "Feast.", "*Family.*"],
  body: "Catering for the tables that matter. Home of The Bun Theory and The Weekend Grill.",
  photo: "Photo: a long table at dusk, the fire behind it, guests mid-meal.",
};

/** The home page's "other kitchens" band (catering is the page itself, so it is left out there). */
export const otherKitchensCopy = {
  eyebrow: "Our other kitchens",
  headline: "Where we *earned* it.",
  intro: "Before the catering came The Bun Theory and The Weekend Grill. Both are still cooking.",
};

export const venturesCopy = {
  eyebrow: "What we do",
  headline: "Three kitchens. *One* fire.",
  intro: "Catering is where it all comes together. The Bun Theory and The Weekend Grill are where we earned it.",
};

export const ventures = [
  {
    key: "catering",
    name: "Catering",
    badge: "Now booking",
    line: "We bring the fire to you.",
    body: "House gatherings, celebrations and family tables, cooked over open flame and served warm. Pick a date and we build the feast around it.",
    photo: "Photo: a catered table, full, the fire glowing behind.",
    href: "/catering/book",
    cta: "Check a date",
    more: { label: "See packages", href: "/#packages" },
  },
  {
    key: "bun-theory",
    name: "The Bun Theory",
    line: "Fried chicken burgers, stacked on artisan buns.",
    body: "It began in the neighbourhood, one home-cooked order at a time. Crisp, hand-battered chicken on a soft toasted bun.",
    photo: "Photo: a fried chicken burger, close.",
    href: brand.bunTheoryUrl,
    cta: "Order online",
    external: true,
  },
  {
    key: "weekend-grill",
    name: "The Weekend Grill",
    line: "Apple-wood smoked roast chicken.",
    body: "Low and slow over apple wood until the skin turns amber and the smoke settles deep. Our weekend ritual.",
    photo: "Photo: chickens in apple-wood smoke.",
    href: "/menu",
    cta: "See the menu",
  },
];

export const storyTeaser = {
  eyebrow: "How it started",
  headline: "From one table to *yours.*",
  paragraphs: [
    "In 2024, John Zachariah roasted a chicken for his church family. One feast turned into a calling.",
    "Bakar & Roast grew from that fire, through neighbourhood kitchens and weekend grills, into the catering we bring to your table today.",
  ],
  photo: "Photo: John carving a roast chicken at a church table.",
  smallPhoto: "Photo: the first home grill, close.",
  action: "Read our story",
};

// ─── Story ───────────────────────────────────────────────────────────────────

export const storyHero: HeroCopy = {
  eyebrow: "Our story",
  // One line that wraps naturally, as in the prototype.
  lines: ["It started with *one* fire."],
  photo: "Photo: John at the grill, smoke rising, wide.",
};

// DRAFT copy from the prototype. The owner to confirm or rewrite.
export const storyIntro: { eyebrow: string; lead: LeadPart[] } = {
  eyebrow: "Fire. Feast. Family.",
  lead: [
    "A home kitchen. A pandemic.",
    { photo: "Photo: a home kitchen at night." },
    "A man who would not stop cooking. What began as dinner for a few",
    { photo: "Photo: a long table, full." },
    "became a table for many.",
  ],
};

// DRAFT founder lines from the prototype. The owner to confirm or rewrite.
export const founders = {
  eyebrow: "The founders",
  headline: "Two people, *one* flame.",
  people: [
    { name: "John Zachariah", line: "Lights the fire. Watches the birds. Carves at the table.", photo: "Photo: John Zachariah, portrait by the fire." },
    { name: "Grace Sheila", line: "Runs the table. Knows every guest count, every allergy, every name.", photo: "Photo: Grace Sheila, portrait at a set table." },
  ],
};

export const chaptersCopy = { eyebrow: "The road here", headline: "Six *chapters.*" };

// DRAFT values from the prototype. The owner to confirm or rewrite.
export const values = {
  eyebrow: "What we stand for",
  headline: "Three *rules.*",
  items: [
    { word: "Fire", title: "Real wood, real time.", line: "No shortcuts. Smoke takes as long as it takes." },
    { word: "Feast", title: "Cooked fresh, served warm.", line: "We cook where you eat, the day you eat." },
    { word: "Family", title: "One table a day.", line: "Yours gets all of us." },
  ],
};

export const storyChapters = [
  {
    year: "2020",
    title: "The first fire",
    photo: "Photo: the first home grill.",
    body: "Through the quiet of the pandemic, John Zachariah cooked. Trial after trial, a home kitchen became a workshop for flame, smoke, and patience.",
  },
  {
    year: "2024",
    title: "A Christmas table",
    photo: "Photo: the Christmas roast chicken.",
    body: "One roasted chicken, cooked for his church family, turned a Christmas feast into a calling. The room went quiet, then came back for seconds.",
  },
  {
    year: "2024",
    title: "Bakar & Roast is born",
    photo: "Photo: John and Grace at the first run.",
    body: "That feast became a small holiday catering run on Facebook Marketplace. John and co-founder Grace Sheila gave it a name and a fire to keep.",
  },
  {
    year: "Along the way",
    title: "The Bun Theory",
    photo: "Photo: a fried chicken burger, close.",
    body: "The first venture beyond the holidays. Fried chicken burgers sold around the neighbourhood, one home-cooked order at a time, until word travelled.",
  },
  {
    year: "Along the way",
    title: "The Weekend Grill",
    photo: "Photo: chickens in apple-wood smoke.",
    body: "Then the roast that would not wait for December. Apple-wood smoked chicken, cooked low and slow, became a weekend ritual of its own.",
  },
  {
    year: "Today",
    title: "The fire comes to your table",
    photo: "Photo: a catered table, full.",
    body: "Every table before this one led here. Catering is where Bakar & Roast brings the whole craft to your gathering.",
  },
];

export const eventTypes = [
  "House gathering",
  "Celebration",
  "Community or church",
  "Corporate",
  "Something else",
];

// ─── Menu ────────────────────────────────────────────────────────────────────

export const menuHero: HeroCopy = {
  eyebrow: "The menu",
  lines: ["Fire", "and", "*field.*"],
  body: "Our menu is still taking shape. The signature roast is ready now, and more is coming to the fire.",
};

export type MenuItem = {
  title: string;
  note: string;
  tag: string;
  photo: string;
  href?: string;
  external?: boolean;
};

export const menuSections: { eyebrow: string; headline: string; items: MenuItem[] }[] = [
  {
    eyebrow: "The Weekend Grill",
    headline: "The *signature.*",
    items: [
      {
        title: "Apple-wood roast chicken",
        note: "Smoked low and slow over apple wood until the skin turns amber. The dish that started it all.",
        tag: "Signature",
        photo: "Photo: a whole roast chicken, skin amber, on the board.",
      },
    ],
  },
  {
    eyebrow: "The Bun Theory",
    headline: "Order *online.*",
    items: [
      {
        title: "Fried chicken burgers",
        note: "Crisp, hand-battered chicken on a soft toasted bun. Ordered online, made fresh.",
        tag: "Order online",
        photo: "Photo: a fried chicken burger, close.",
        href: brand.bunTheoryUrl,
        external: true,
      },
    ],
  },
  {
    eyebrow: "Coming soon",
    headline: "Next to the *fire.*",
    items: [
      { title: "Flame-grilled cuts", note: "Seared over open fire.", tag: "Coming soon", photo: "Photo: cuts searing on the grill." },
      { title: "The weekend roast", note: "A rotating roast, cooked for the day.", tag: "Coming soon", photo: "Photo: a roast resting on the board." },
      { title: "Fire-kissed sides", note: "Char and warmth to round the table.", tag: "Coming soon", photo: "Photo: sides in cast iron on the coals." },
      { title: "Garden plates", note: "Fresh, bright, cooked with care.", tag: "Coming soon", photo: "Photo: a bright salad on a dark table." },
      { title: "Warm breads", note: "Baked to carry the fire.", tag: "Coming soon", photo: "Photo: flatbreads blistering over coals." },
    ],
  },
];

// ─── Contact ─────────────────────────────────────────────────────────────────

export const contactHero: HeroCopy = {
  eyebrow: "Contact",
  lines: ["Come", "to the", "*fire.*"],
  body: "Ask about a date, a menu, or just say hello. We answer fastest on WhatsApp.",
};

export const contactCopy = {
  formEyebrow: "Just chatting",
  formHeadline: "Start a *chat.*",
  formIntro: "Fill this in and WhatsApp opens with your message ready. Nothing is booked until you pick a date.",
  tip: "We cook one event a day, so weekends go first. Check a date early.",
};

// ─── Booking flow (/catering/book) and status page (/booking/[token]) ───────
// Every notice, window, hold and cutoff number comes from the owner settings (`rules`).

/** Requests one customer may have waiting at once. Mirrors the server's MAX_PENDING_PER_CUSTOMER. */
export const MAX_PENDING = 2;

/** The destination's name on the page transition panels (app/template.tsx). */
export function routeName(pathname: string): string {
  if (pathname === "/") return "Home";
  if (pathname.startsWith("/catering/book")) return "Check a date";
  if (pathname.startsWith("/booking/")) return "Your booking";
  const names: Record<string, string> = {
    catering: "Catering",
    menu: "Menu",
    story: "Story",
    contact: "Contact",
    account: "My bookings",
  };
  return names[pathname.split("/")[1]] ?? "Bakar & Roast";
}

const days = (n: number) => `${n} day${n === 1 ? "" : "s"}`;
const months = (n: number) => `${n} month${n === 1 ? "" : "s"}`;

export const bookingCopy = {
  steps: [
    { headline: "Pick a *date.*", back: "Back to catering", next: "Choose a package" },
    { headline: "Choose a *package.*", back: "Back to date", next: "Add details" },
    { headline: "Where do we *deliver?*", back: "Back to package", next: "Review" },
    { headline: "Check it *over.*", back: "Back to details", next: "Send request" },
  ],
  dateIntro: (r: CateringRules) =>
    `We deliver. Dates open ${days(r.cateringMinNoticeDays)} ahead, up to ${months(r.cateringBookingWindowMonths)} out. Greyed-out days are full or closed.`,
  hold: (r: CateringRules) =>
    `Your spot is held for ${days(r.cateringHoldExpiryDays)}. Pay and upload the receipt on your booking page, and we confirm.`,
  quote: "No price list. We agree the quote with you by call.",
  noDate: "No date picked yet",
  noOpenDates: "No open dates this month. Try the next one.",
  calendarFailed: "We could not load the calendar.",
  notYet: "Not yet",
  nothingYet: "Nothing picked yet",
  guestHelp: (name: string, min: number, max: number | null) =>
    max == null ? `${name} serves from ${min} guests.` : `${name} serves ${min} to ${max} guests.`,
  guestMoved: (n: number) => ` We moved your count to ${n} to fit.`,
  contactNote: "No account needed. We only use these to reach you about this booking.",
  tip: (r: CateringRules) =>
    `We cook a few orders a day and deliver them. You can cancel from your booking page until ${days(r.cateringCancelCutoffDays)} before delivery.`,
  faq: (r: CateringRules) => [
    { q: "How do I pay?", a: "Pay half or in full by bank transfer or DuitNow QR, then upload the receipt on your booking page." },
    { q: "Paid on your phone but booked on a computer?", a: "Your booking page shows a QR code. Scan it with your phone and upload the screenshot from there." },
    { q: "How long is my spot held?", a: `For ${days(r.cateringHoldExpiryDays)} while you pay and we confirm.` },
  ],
  occasions: eventTypes,
  errors: {
    needDate: { title: "Pick a date first.", body: "Tap any open day on the calendar." },
    needPackage: { title: "Choose a package first.", body: "You can change it later on the call." },
    needDetails: { title: "Some details need another look.", body: "Check the fields marked below." },
    dateTaken: { title: "That date was just taken. Pick another.", body: "Your package and details are still here." },
    tooManyPending: {
      title: `You have ${MAX_PENDING} requests waiting on us. We will call you about those first.`,
      body: "Want to talk about them now?",
    },
    rateLimited: { title: "Too many attempts. Try again in a little while.", body: "Or message us and we will take it from there." },
    validation: { title: "Some details need another look." },
    failed: { title: "We could not send your request.", body: "Nothing was sent. Try again, or message us." },
  },
  done: {
    eyebrow: "Request sent",
    headline: "We have your *request.*",
    callLine: (phone: string) => `We will call you on ${phone}.`,
    heldLine: (day: string) => ` Your spot is held until ${day}.`,
    action: "Pay and send receipt",
  },
  packagesFailed: "We could not load the packages just now. Message us and we will book you in by chat.",
  packagesEmpty: "No packages are open for booking just now. Message us and we will sort out your table.",
  whatsappMessage: "Hi Bakar & Roast, I would like to book catering.",
};

export const statusCopy = {
  title: "Your booking | Bakar & Roast",
  back: { label: "Back to catering", href: "/" },
  summary: "Your table",
  headline: {
    PENDING: "We have your *request.*",
    APPROVED: "Your date is *confirmed.*",
    DECLINED: "We cannot take *this one.*",
    CANCELLED: "Your booking is *cancelled.*",
    EXPIRED: "We could not confirm *in time.*",
    COMPLETED: "Thank you for *having us.*",
  },
  body: {
    PENDING: (heldUntil: string | null) =>
      heldUntil
        ? `Your spot is held until ${heldUntil}. Pay below and upload the receipt, and we confirm.`
        : "Your spot is held. Pay below and upload the receipt, and we confirm.",
    APPROVED: "You are on our list. We will be in touch before delivery.",
    DECLINED: "Thank you for asking us.",
    CANCELLED: "The date is open again. We hope to cook for you another time.",
    EXPIRED: "The hold has ended and the date is open again. Sorry we missed you.",
    COMPLETED: "It was a good fire. Come back to the table any time.",
  },
  cancelRequest: "Cancel request",
  cancelBooking: "Cancel booking",
  cancelUntil: (day: string) => `You can cancel until ${day}.`,
  deadlinePassed: "The cancellation deadline has passed. Contact us.",
  openWhatsapp: "Open WhatsApp",
  pickAnother: "Pick another date",
  bookAgain: "Book again",
  dialog: {
    title: (kind: "request" | "booking") => `Cancel this ${kind}?`,
    body: (date: string) => `${date} will open up for someone else. This cannot be undone.`,
    yes: "Yes, cancel it",
    no: "Keep my booking",
    busy: "Cancelling",
    failed: "We could not cancel just now. Try again, or message us.",
  },
  notFound: {
    eyebrow: "Not found",
    headline: "We cannot find that *booking.*",
    body: "The link may be old or mistyped.",
  },
  loadFailed: {
    eyebrow: "Booking",
    headline: "We could not *load* it.",
    body: "Your booking is safe. Try again in a moment, or message us.",
    retry: "Try again",
  },
};

// ─── Customer account (/account) ─────────────────────────────────────────────

/** Mirrors the backend's emailOTP `expiresIn` (300 seconds). Change both together. */
export const CODE_MINUTES = 5;
/** Seconds before "Send a new code" works again. */
export const RESEND_SECONDS = 60;

export const accountCopy = {
  title: "My bookings | Bakar & Roast",
  eyebrow: "My bookings",
  loading: "Checking your sign-in",
  email: {
    headline: "Find your *table.*",
    lead: "Sign in with the email you booked with. No password. We email you a 6-digit code.",
    label: "Email",
    placeholder: "you@example.com",
    send: "Send me a code",
    sending: "Sending",
    linkNote: "Have a booking link from our email? It still works without signing in.",
    ended: "Your session ended. Sign in again.",
  },
  code: {
    headline: "Check your *email.*",
    sentTo: (email: string) => `We sent a 6-digit code to ${email}. It expires in ${CODE_MINUTES} minutes.`,
    label: "Code",
    placeholder: "6 digits",
    submit: "Sign in",
    submitting: "Signing in",
    change: "Use a different email",
    resend: "Send a new code",
    resendIn: (s: number) => `Send a new code in ${s}s`,
    resent: "We sent a new code.",
  },
  errors: {
    badEmail: "Enter an email like you@example.com.",
    sixDigits: "Enter the 6 digits from the email.",
    wrong: "That code is not right. Check the email and try again.",
    expired: "That code has expired. Send a new one.",
    tooManyTries: "Too many tries. Send a new code.",
    rateLimited: "Too many tries. Wait a minute, then try again.",
    sendFailed: "We could not send a code just now. Try again in a moment.",
    signInFailed: "We could not sign you in just now. Try again in a moment.",
  },
  list: {
    eyebrow: "Signed in as",
    headline: "Your *bookings.*",
    empty: "No bookings under this email yet.",
    emptyHelp: "Booked with a different email? Sign out and try that one.",
    loadFailed: "We could not load your bookings.",
    loadFailedHelp: "Check the connection and try again.",
    retry: "Try again",
    open: "Open",
    book: "Check a date",
    signOut: "Sign out",
    signingOut: "Signing out",
  },
  booking: {
    signedIn: (email: string) => `Signed in as ${email}. This booking goes straight into your bookings.`,
    guestAsk: "Booked with us before?",
    guestLink: "Sign in to fill this in",
    saved: "Saved to your bookings.",
    seeAll: "See all my bookings",
    guestTitle: "Want every booking in one place?",
    guestBody: (email: string) => `Sign in with ${email}. No password, we email you a code.`,
    guestAction: "Sign in with this email",
    waiting: "Waiting on us:",
  },
  back: { label: "All my bookings", href: "/account" },
};

// ─── Owner admin ─────────────────────────────────────────────────────────────

export const adminCopy = {
  login: {
    title: "Owner sign in",
    sub: "Requests, calendar and packages in one place.",
    submit: "Sign in",
    busy: "Signing in",
    back: "Back to the site",
    wrong: "That email or password is not right.",
    wrongHelp: "Check them and try again.",
    tooMany: "Too many tries.",
    tooManyHelp: "Wait a few minutes, then try again.",
    expired: "Your session ended. Sign in again.",
    emailMissing: "Enter the email you sign in with.",
    passwordMissing: "Enter your password.",
  },
  errors: {
    forbidden: "Your account cannot make changes here.",
    changed: "This request changed. Here is the latest.",
    loadFailed: "We could not load this.",
    loadFailedHelp: "Check the connection and try again.",
    saveFailed: "We could not save that.",
    saveFailedHelp: "Nothing changed. Check the connection and try again.",
    retry: "Try again",
  },
  empty: {
    pending: ["No pending requests.", "New requests land here the moment they come in."],
    approved: ["Nothing approved yet.", "Approved bookings show here with their event dates."],
    past: ["No past events yet.", "Completed, declined, cancelled and expired requests show here."],
    all: ["No requests yet.", "Share the booking page to get the first one."],
  },
  noMatch: (q: string) => `Nothing matches "${q}".`,
  noMatchHelp: "Check the spelling or look in the All tab.",
  capped: "Showing the latest 200 requests.",
  waMessage: (name: string, reference: string, date: string) =>
    `Hi ${name}, this is Bakar & Roast about your booking ${reference} for ${date}.`,
};
