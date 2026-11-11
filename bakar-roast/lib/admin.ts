// Pure owner-admin helpers: money, payment headline, hold wording, tabs, search, activity log,
// greeting, WhatsApp number, settings lines, package form, reordering, upload checks. Type imports
// plus ./dates only, so the file runs under `node --experimental-strip-types`. Money is always
// integer cents, never float maths.
import type { CateringBookingAdmin, CateringBookingStatus } from "./api";
import type { CateringRules, PackageInput } from "./catering-api";
import { addDaysYmd, addMonthsYmd, formatDayMonth, formatLong, parseYmd } from "./dates";

// ─── Money ───────────────────────────────────────────────────────────────────

/** "1250.00" or "5,700" or "99.5" to cents. Empty is null. Anything else is NaN. */
export function toCents(input: string | null | undefined): number | null {
  const s = String(input ?? "").replace(/[\s,]/g, "").replace(/^RM/i, "");
  if (s === "") return null;
  const m = /^(\d+)(?:\.(\d{0,2}))?$/.exec(s);
  if (!m) return Number.NaN;
  return Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
}

/** Cents to the number the API takes (two decimals at most, exact for whole cents). */
export const centsToAmount = (cents: number) => cents / 100;

/** "RM 1,000" when whole, "RM 1,000.50" otherwise. */
export function formatRM(cents: number): string {
  const whole = Math.floor(Math.abs(cents) / 100);
  const rest = Math.abs(cents) % 100;
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${cents < 0 ? "-" : ""}RM ${grouped}${rest ? `.${String(rest).padStart(2, "0")}` : ""}`;
}

/** The message for an amount pair, or "" when fine. Empty amounts are allowed. */
export function amountsError(quote: number | null, deposit: number | null): { quote: string; deposit: string } {
  const out = { quote: "", deposit: "" };
  if (Number.isNaN(quote)) out.quote = "Enter an amount like 5700 or 5700.50.";
  if (Number.isNaN(deposit)) out.deposit = "Enter an amount like 1000 or 1000.50.";
  if (!out.quote && !out.deposit && quote !== null && deposit !== null && deposit > quote)
    out.deposit = "The deposit cannot be more than the quote.";
  return out;
}

export type PayHeadline = { title: string; sub: string; hot: boolean };

/**
 * The payment headline, worked out from the numbers (prototype `payLine`). Balance paid wins
 * over a deposit still marked unpaid. A zero deposit counts as no deposit. `hot` = deposit due.
 */
export function payHeadline(p: {
  quote: number | null;
  deposit: number | null;
  depositPaid: boolean;
  balancePaid: boolean;
}): PayHeadline {
  const q = p.quote === null || Number.isNaN(p.quote) ? null : p.quote;
  const d = p.deposit === null || Number.isNaN(p.deposit) || p.deposit === 0 ? null : p.deposit;
  if (q === null) return { title: "No quote yet", sub: "Add the quote after the call.", hot: false };
  if (p.balancePaid) return { title: "Paid in full", sub: `${formatRM(q)} received.`, hot: false };
  const balance = q - (d ?? 0);
  if (d !== null && !p.depositPaid)
    return { title: `${formatRM(d)} deposit due`, sub: `Then ${formatRM(balance)} balance.`, hot: true };
  if (d !== null && balance === 0) return { title: "Paid in full", sub: `Deposit of ${formatRM(d)} received.`, hot: false };
  if (d !== null)
    return { title: `${formatRM(balance)} balance due`, sub: `Deposit of ${formatRM(d)} received.`, hot: false };
  return { title: `${formatRM(q)} balance due`, sub: "No deposit set.", hot: false };
}

/** The headline for a booking as saved. */
export const bookingPayHeadline = (b: CateringBookingAdmin) =>
  payHeadline({
    quote: toCents(b.quoteAmount),
    deposit: toCents(b.depositAmount),
    depositPaid: !!b.depositPaidAt,
    balancePaid: !!b.balancePaidAt,
  });

// ─── Hold ────────────────────────────────────────────────────────────────────

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const HOUR = 36e5;

/** "5 hours left" (urgent under 24 hours), "2 days left", "Ending now", or a dash when not pending. */
export function holdLeft(
  b: Pick<CateringBookingAdmin, "status" | "holdExpiresAt">,
  now: number = Date.now(),
): { text: string; urgent: boolean } {
  if (b.status !== "PENDING" || !b.holdExpiresAt) return { text: "–", urgent: false };
  const h = (Date.parse(b.holdExpiresAt) - now) / HOUR;
  if (h <= 0) return { text: "Ending now", urgent: true };
  if (h < 24) return { text: `${plural(Math.ceil(h), "hour")} left`, urgent: true };
  return { text: `${plural(Math.ceil(h / 24), "day")} left`, urgent: false };
}

/** Pending with the hold ending within 24 hours (or already past it). */
export const holdEndsSoon = (b: CateringBookingAdmin, now: number = Date.now()) =>
  b.status === "PENDING" && !!b.holdExpiresAt && Date.parse(b.holdExpiresAt) - now < 24 * HOUR;

// ─── Requests list ───────────────────────────────────────────────────────────

export type RequestTab = "pending" | "approved" | "past" | "all";
export const REQUEST_TABS: RequestTab[] = ["pending", "approved", "past", "all"];
export const asTab = (v: string | null | undefined): RequestTab =>
  REQUEST_TABS.includes(v as RequestTab) ? (v as RequestTab) : "pending";

export type RequestSort = "event" | "new";
export const asSort = (v: string | null | undefined): RequestSort => (v === "new" ? "new" : "event");

/** Which tab a booking lives in. An approved booking whose date has gone is Past. `today` is KL YYYY-MM-DD. */
export function requestTab(b: Pick<CateringBookingAdmin, "status" | "eventDate">, today: string): Exclude<RequestTab, "all"> {
  if (b.status === "PENDING") return "pending";
  if (b.status === "APPROVED" && b.eventDate >= today) return "approved";
  return "past";
}

export const inTab = (b: CateringBookingAdmin, tab: RequestTab, today: string) =>
  tab === "all" || requestTab(b, today) === tab;

/** Digits only, with Malaysia's leading 60 read as the local 0 ("+60 12" and "012" match). */
const phoneDigits = (v: string) => v.replace(/\D/g, "").replace(/^60/, "0");

/** Case-insensitive over name, reference, email, package; a phone-shaped query matches digits only. */
export function matchesSearch(b: CateringBookingAdmin, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const digits = phoneDigits(q);
  if (/^[\d\s+\-()]+$/.test(q) && digits) return phoneDigits(b.customerPhone).includes(digits);
  return [b.customerName, b.reference, b.customerEmail, b.packageName, b.customerPhone].some((v) =>
    v.toLowerCase().includes(q),
  );
}

/** By event date (soonest first; Past newest first) or newest request first. Returns a new array. */
export function sortRequests(list: CateringBookingAdmin[], sort: RequestSort, tab: RequestTab): CateringBookingAdmin[] {
  const out = [...list];
  if (sort === "new") return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const dir = tab === "past" ? -1 : 1;
  return out.sort((a, b) => dir * (a.eventDate.localeCompare(b.eventDate) || a.createdAt.localeCompare(b.createdAt)));
}

// ─── Activity log ────────────────────────────────────────────────────────────

/**
 * Built from the booking's timestamps (there is no activity table), newest first.
 * COMPLETED has no timestamp of its own, so it does not appear. A pending hold shows when it ends.
 */
export function activityLog(b: CateringBookingAdmin): { label: string; at: string }[] {
  const items: { label: string; at: string | null }[] = [
    { label: "Request received", at: b.createdAt },
    {
      label: b.status === "DECLINED" ? (b.declineReason ? `Declined. Reason: ${b.declineReason}` : "Declined") : "Approved",
      at: b.decidedAt,
    },
    { label: "Cancelled", at: b.cancelledAt },
    { label: "Deposit paid", at: b.depositPaidAt },
    { label: "Balance paid", at: b.balancePaidAt },
    { label: "Hold expired", at: b.status === "EXPIRED" ? b.holdExpiresAt : null },
    { label: "Hold ends", at: b.status === "PENDING" ? b.holdExpiresAt : null },
  ];
  return items
    .filter((i): i is { label: string; at: string } => !!i.at)
    .sort((x, y) => Date.parse(y.at) - Date.parse(x.at));
}

// ─── Next step ───────────────────────────────────────────────────────────────

const STATUS_WORD: Record<CateringBookingStatus, string> = {
  PENDING: "pending",
  APPROVED: "approved",
  DECLINED: "declined",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
  COMPLETED: "completed",
};

/** The one sentence in the detail's "next step" bar. */
export function nextStep(b: Pick<CateringBookingAdmin, "status" | "customerName">): string {
  if (b.status === "PENDING") return `Call ${firstName(b.customerName)}, agree the menu and quote, then approve.`;
  if (b.status === "APPROVED") return "Booked. Mark it completed after the event.";
  return `Nothing to do. This request is ${STATUS_WORD[b.status]}.`;
}

// ─── People ──────────────────────────────────────────────────────────────────

export const firstName = (name: string | null | undefined) => (name ?? "").trim().split(/\s+/)[0] ?? "";

/** "JZ" from "John Zachariah"; falls back to the email's first letter. */
export function initials(displayName: string | null | undefined, email: string): string {
  const parts = (displayName ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return email.slice(0, 1).toUpperCase();
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/** "Good evening, John." from the Malaysia hour (0 to 23). No name gives "Good evening." */
export function greeting(hour: number, displayName: string | null | undefined): string {
  const part = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  const name = firstName(displayName);
  return `Good ${part}${name ? `, ${name}` : ""}.`;
}

/** The sentence under the greeting. */
export function waitingSentence(pending: number, endingSoon: number): string {
  if (!pending) return "Nothing is waiting on you.";
  const head = `${pending} request${pending === 1 ? " is" : "s are"} waiting on you`;
  return endingSoon ? `${head}, ${endingSoon} with the hold ending within a day.` : `${head}.`;
}

/** Digits for wa.me: a local number's leading 0 becomes Malaysia's 60. */
export function waNumber(phone: string): string {
  const d = phone.replace(/\D/g, "");
  return d.startsWith("0") ? `60${d.slice(1)}` : d;
}

// ─── Settings: the four booking rules ────────────────────────────────────────

export type RuleKey = keyof CateringRules;

/** Server limits per rule, and the unit shown beside the value. */
export const RULES: Record<RuleKey, { min: number; max: number; unit: "day" | "month" }> = {
  cateringMinNoticeDays: { min: 0, max: 365, unit: "day" },
  cateringBookingWindowMonths: { min: 1, max: 24, unit: "month" },
  cateringHoldExpiryDays: { min: 1, max: 60, unit: "day" },
  cateringCancelCutoffDays: { min: 0, max: 365, unit: "day" },
};

/** "Tuesday 17 November", with the year only when it is not this year's. */
const dayWords = (ymd: string, today: string) =>
  ymd.slice(0, 4) === today.slice(0, 4) ? formatDayMonth(ymd) : formatLong(ymd);

/** The sample event for the cutoff line: the first Saturday at least 30 days out. */
export function sampleEventDate(today: string): string {
  const d = addDaysYmd(today, 30);
  return addDaysYmd(d, (6 - parseYmd(d).getUTCDay() + 7) % 7);
}

/**
 * What each rule means today, in Malaysia dates (`today` from klToday()). Mirrors the server:
 * first day = today + notice, last day = today + window months (month-end clamp), a hold
 * runs hold days from now, the last cancel day is the event date minus the cutoff.
 */
export function ruleLines(r: CateringRules, today: string): Record<RuleKey, string> {
  const sample = sampleEventDate(today);
  return {
    cateringMinNoticeDays: `Today the first day a customer can book is ${dayWords(addDaysYmd(today, r.cateringMinNoticeDays), today)}.`,
    cateringBookingWindowMonths: `The calendar is open up to ${formatLong(addMonthsYmd(today, r.cateringBookingWindowMonths))}.`,
    cateringHoldExpiryDays: `A request sent now is held until ${dayWords(addDaysYmd(today, r.cateringHoldExpiryDays), today)}. After that it expires and the date reopens.`,
    cateringCancelCutoffDays: `For an event on ${dayWords(sample, today)}, they can cancel until ${dayWords(addDaysYmd(sample, -r.cateringCancelCutoffDays), today)}. After that they message you.`,
  };
}

/** The cutoff is not lower than the notice: the earliest bookings cannot be cancelled online. */
export const cutoffWarning = (r: Pick<CateringRules, "cateringMinNoticeDays" | "cateringCancelCutoffDays">) =>
  r.cateringCancelCutoffDays >= r.cateringMinNoticeDays;

export const ruleValue = (n: number, unit: "day" | "month") => plural(n, unit);

export const isEmailShape = (v: string) => /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)*\.[A-Za-z]{2,}$/.test(v.trim());

// ─── Packages: the editor form ───────────────────────────────────────────────

export type PackageDraft = {
  name: string;
  tagline: string;
  description: string;
  includes: string[];
  imageUrl: string;
  minGuests: string;
  maxGuests: string;
};

export type PackageErrors = Partial<Record<"name" | "description" | "includes" | "minGuests" | "maxGuests", string>>;

/** Mirrors the server DTO. Blank included rows are dropped. Returns the body to send, or the errors. */
export function validatePackage(d: PackageDraft): { errors: PackageErrors; input: PackageInput | null } {
  const errors: PackageErrors = {};
  const name = d.name.trim();
  const description = d.description.trim();
  const includes = d.includes.map((s) => s.trim()).filter(Boolean);
  const whole = (s: string) => (/^\d+$/.test(s.trim()) ? Number(s.trim()) : Number.NaN);
  const min = whole(d.minGuests);
  const max = d.maxGuests.trim() === "" ? null : whole(d.maxGuests);

  if (!name) errors.name = "Give the package a name.";
  else if (name.length > 80) errors.name = "Keep the name to 80 characters.";
  if (!description) errors.description = "Add a few words about the package.";
  else if (description.length > 2000) errors.description = "Keep the description to 2000 characters.";
  if (!includes.length) errors.includes = "Add at least one included item.";
  else if (includes.length > 30) errors.includes = "Keep it to 30 items.";
  else if (includes.some((s) => s.length > 160)) errors.includes = "Keep each item to 160 characters.";
  else if (new Set(includes.map((s) => s.toLowerCase())).size !== includes.length)
    errors.includes = "Each item needs to be different.";
  if (!(min >= 1 && min <= 5000)) errors.minGuests = "Enter 1 to 5000 guests.";
  if (max !== null && !(max >= 1 && max <= 5000)) errors.maxGuests = "Up to 5000, or leave it empty.";
  else if (max !== null && !errors.minGuests && max < min) errors.maxGuests = "The maximum cannot be lower than the minimum.";

  if (Object.keys(errors).length) return { errors, input: null };
  return {
    errors,
    input: {
      name,
      tagline: d.tagline.trim(),
      description,
      includes,
      imageUrl: d.imageUrl,
      minGuests: min,
      maxGuests: max,
    },
  };
}

// ─── Ordering (packages, gallery, testimonials) ──────────────────────────────

type Sortable = { id: string; sortOrder: number };

/**
 * Move item `index` one place (`dir` -1 up, 1 down). Neighbours swap their sortOrder when every
 * value is distinct and rising; otherwise (ties, or out of order) the whole list is renumbered
 * 0..n-1. Returns the new list and only the rows whose sortOrder changed, or null at the ends.
 */
export function moveItem<T extends Sortable>(
  list: T[],
  index: number,
  dir: -1 | 1,
): { list: T[]; updates: { id: string; sortOrder: number }[] } | null {
  const j = index + dir;
  if (index < 0 || index >= list.length || j < 0 || j >= list.length) return null;
  const strict = list.every((x, i) => i === 0 || x.sortOrder > list[i - 1].sortOrder);
  const swapped = [...list];
  [swapped[index], swapped[j]] = [swapped[j], swapped[index]];
  const next = strict
    ? swapped.map((x) =>
        x.id === list[index].id ? { ...x, sortOrder: list[j].sortOrder } : x.id === list[j].id ? { ...x, sortOrder: list[index].sortOrder } : x,
      )
    : swapped.map((x, i) => ({ ...x, sortOrder: i }));
  const before = new Map(list.map((x) => [x.id, x.sortOrder]));
  return {
    list: next,
    updates: next.filter((x) => before.get(x.id) !== x.sortOrder).map((x) => ({ id: x.id, sortOrder: x.sortOrder })),
  };
}

/** The sortOrder for a row added at the end. */
export const nextSortOrder = (list: Sortable[]) => (list.length ? Math.max(...list.map((x) => x.sortOrder)) + 1 : 0);

// ─── Uploads ─────────────────────────────────────────────────────────────────

export const UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
export const UPLOAD_ACCEPT = "image/jpeg,image/png,image/webp";
export const UPLOAD_RULE = "Use a JPG, PNG or WebP photo up to 5 MB.";

/** The message when a picked file would be refused (type, extension or size), or null. The server checks both too. */
export function uploadProblem(file: { name: string; type: string; size: number }): string | null {
  const okType = ["image/jpeg", "image/png", "image/webp"].includes(file.type.toLowerCase());
  const okExt = /\.(jpe?g|png|webp)$/i.test(file.name);
  return okType && okExt && file.size > 0 && file.size <= UPLOAD_MAX_BYTES ? null : UPLOAD_RULE;
}
