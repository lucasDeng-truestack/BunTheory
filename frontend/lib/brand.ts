/** Canonical customer-facing name (navbar, titles, defaults when company name unset). */
export const BRAND_FULL_NAME = "The Bun Theory by Bakar & Roast";

/** Split for two-line headers (e.g. landing marketing bar). */
export const BRAND_TITLE_LINE = "The Bun Theory";
export const BRAND_SUBLINE = "by Bakar & Roast";

/** Parent umbrella name, used for the link back to the brand site. */
export const BRAND_PARENT_NAME = "Bakar & Roast";

/**
 * Umbrella brand marketing site (Bakar & Roast). Env-overridable so it points
 * at the deployed domain in production and localhost:3200 in dev.
 */
export const BRAND_SITE_URL =
  process.env.NEXT_PUBLIC_BRAND_SITE_URL ?? "http://localhost:3200";
