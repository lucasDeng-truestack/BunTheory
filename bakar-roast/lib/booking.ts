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

export const LIMITS = { customerName: 80, eventAddress: 300, dietaryNotes: 500, notes: 1000, customerEmail: 160 };

export type DetailsInput = {
  serviceTime: string;
  eventAddress: string;
  occasion: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
};
export type DetailsField = keyof DetailsInput;
export const DETAIL_FIELDS: DetailsField[] = [
  "serviceTime",
  "eventAddress",
  "occasion",
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
      return /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? "" : "Tell us when to serve.";
    case "eventAddress":
      return v.length > 5 ? "" : "Add the full address so we can find you.";
    case "occasion":
      return v ? "" : "Pick the closest one.";
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
