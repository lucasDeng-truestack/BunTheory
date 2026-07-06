/**
 * Currency helpers. The storefront shows Malaysian Ringgit as `RM 12.00`
 * (space after the prefix) — this is the single source of truth for that format.
 */

/** Coerce a Prisma `Decimal` (serialised as string), number, or nullish to a finite number. */
export function toAmount(value: number | string | null | undefined): number {
  if (value == null) return 0;
  const n = typeof value === "string" ? parseFloat(value) : value;
  return Number.isFinite(n) ? n : 0;
}

/** Canonical storefront currency format, e.g. `RM 12.00`. */
export function formatRM(value: number | string | null | undefined): string {
  return `RM ${toAmount(value).toFixed(2)}`;
}
