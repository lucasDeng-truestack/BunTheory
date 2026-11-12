// Pure booking helpers: day states, validation, small wording helpers.
// Type imports only, so the file runs as-is under `node --experimental-strip-types`.
import type { CateringAvailability } from "./api";

/** "1 day", "3 days". */
export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** "19:00" to "7:00 pm". Empty in, empty out. */
export function formatTime12(hhmm: string): string {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) return hhmm;
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h < 12 ? "am" : "pm"}`;
}

// ─── Calendar day states ─────────────────────────────────────────────────────

/** `past` is before today in Malaysia; it looks like the other-month days (40%, plain). */
export type DayState = "available" | "selected" | "unavailable" | "soon" | "beyond" | "past";

export const DAY_STATE_LABEL: Record<DayState, string> = {
  available: "available",
  selected: "selected",
  unavailable: "unavailable",
  soon: "too soon to book",
  beyond: "not open yet",
  past: "past",
};

/** YYYY-MM-DD strings compare correctly as strings. */
export function classifyDay(
  ymd: string,
  ctx: { today: string; availability: CateringAvailability; taken: Set<string>; selected: string | null },
): DayState {
  if (ymd < ctx.today) return "past";
  if (ymd < ctx.availability.minDate) return "soon";
  if (ymd > ctx.availability.maxDate) return "beyond";
  if (ctx.taken.has(ymd)) return "unavailable";
  return ymd === ctx.selected ? "selected" : "available";
}

export const isPickable = (s: DayState) => s === "available" || s === "selected";

// ─── Step 3 validation (mirrors the backend DTO) ─────────────────────────────

// ─── Price (mirrors the backend: per set, or per pax x guests; half rounded to the sen) ──

/** Price in sen (integer) from a "45.00" string, or null. */
const toSen = (v: string | null | undefined) => (v == null ? null : Math.round(Number(v) * 100));

/** "RM 1,250.00" */
export const formatRm = (sen: number) =>
  `RM ${(sen / 100).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** "RM 45.00 per pax", "RM 300.00 per set", or null when the package is quoted. */
export function priceLabel(p: { price: string | null; priceUnit: "PER_SET" | "PER_PAX" }): string | null {
  const sen = toSen(p.price);
  if (sen == null) return null;
  return `${formatRm(sen)} ${p.priceUnit === "PER_PAX" ? "per pax" : "per set"}`;
}

/** Total and amount due now, in sen. Null when the package has no price. */
export function orderAmounts(
  p: { price: string | null; priceUnit: "PER_SET" | "PER_PAX" } | null,
  guests: number | null,
): { total: number; half: number } | null {
  const sen = p ? toSen(p.price) : null;
  if (sen == null || guests == null) return null;
  const total = p!.priceUnit === "PER_PAX" ? sen * guests : sen;
  return { total, half: Math.round(total / 2) };
}

/** Delivery times, grouped so the picker shows a few at a time. */
export const DELIVERY_PERIODS: { key: string; label: string; range: string; slots: string[] }[] = [
  { key: "morning", label: "Morning", range: "10 to 11:30 am", slots: ["10:00", "10:30", "11:00", "11:30"] },
  { key: "lunch", label: "Lunch", range: "12 to 2:30 pm", slots: ["12:00", "12:30", "13:00", "13:30", "14:00", "14:30"] },
  { key: "afternoon", label: "Afternoon", range: "3 to 5:30 pm", slots: ["15:00", "15:30", "16:00", "16:30", "17:00", "17:30"] },
  { key: "evening", label: "Evening", range: "6 to 9 pm", slots: ["18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00"] },
];

/** Delivery slots offered in the time picker: 10:00 am to 9:00 pm, every 30 minutes. */
export const DELIVERY_SLOTS: string[] = Array.from({ length: 23 }, (_, i) => {
  const mins = 10 * 60 + i * 30;
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
});

export const MY_STATES = [
  "Johor",
  "Kedah",
  "Kelantan",
  "Kuala Lumpur",
  "Labuan",
  "Melaka",
  "Negeri Sembilan",
  "Pahang",
  "Perak",
  "Perlis",
  "Pulau Pinang",
  "Putrajaya",
  "Sabah",
  "Sarawak",
  "Selangor",
  "Terengganu",
];

/** The address parts as one line for the booking: "12 Jalan SS 2/24, Taman X, 47300 Petaling Jaya, Selangor". */
export function joinAddress(a: Pick<DetailsInput, "addressLine1" | "addressLine2" | "postcode" | "city" | "state">): string {
  const place = [a.postcode.trim(), a.city.trim()].filter(Boolean).join(" ");
  return [a.addressLine1.trim(), a.addressLine2.trim(), place, a.state.trim()].filter(Boolean).join(", ");
}

export const LIMITS = { customerName: 80, eventAddress: 300, dietaryNotes: 500, notes: 1000, customerEmail: 160 };

export type DetailsInput = {
  serviceTime: string;
  addressLine1: string;
  addressLine2: string;
  postcode: string;
  city: string;
  state: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
};
export type DetailsField = keyof DetailsInput;
export const DETAIL_FIELDS: DetailsField[] = [
  "serviceTime",
  "addressLine1",
  "postcode",
  "city",
  "state",
  "customerName",
  "customerPhone",
  "customerEmail",
];

/** 7 to 15 digits, an optional leading +, spaces and dashes between. Same rule as the server. */
export const isPhone = (v: string) => /^\+?(?:[\s-]*\d){7,15}[\s-]*$/.test(v.trim());
export const isEmail = (v: string) => /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)*\.[A-Za-z]{2,}$/.test(v.trim());

/** The message for one field, or "" when it is fine. Messages say what to do. */
export function validateField(field: DetailsField, d: DetailsInput): string {
  const v = d[field].trim();
  switch (field) {
    case "serviceTime":
      return /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? "" : "Tell us when to deliver.";
    case "addressLine1":
      if (v.length < 3) return "Add the house number and street.";
      return joinAddress(d).length > LIMITS.eventAddress ? "Keep the whole address under 300 characters." : "";
    case "addressLine2":
      return "";
    case "postcode":
      return /^\d{5}$/.test(v) ? "" : "Enter the 5-digit postcode.";
    case "city":
      return v ? "" : "Add the city or town.";
    case "state":
      return v ? "" : "Pick the state.";
    case "customerName":
      return v ? "" : "Add your name.";
    case "customerPhone":
      return isPhone(v) ? "" : "Enter a full phone number so we can call you.";
    case "customerEmail":
      return isEmail(v) ? "" : "Enter an email like you@example.com.";
  }
}

export function validateDetails(d: DetailsInput): Partial<Record<DetailsField, string>> {
  const out: Partial<Record<DetailsField, string>> = {};
  for (const f of DETAIL_FIELDS) {
    const msg = validateField(f, d);
    if (msg) out[f] = msg;
  }
  return out;
}

/** Clamp a headcount into a package's range (max null = no upper limit). */
export const clampGuests = (n: number, min: number, max: number | null) =>
  Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(min, Math.round(n)));
