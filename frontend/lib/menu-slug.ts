/**
 * Canonical form for menu slugs used in cart lines and validation.
 * Keeps server/client/cart in sync even if the API returns stray whitespace or casing.
 */
export function normalizeMenuSlug(slug: string): string {
  return slug.trim().toLowerCase();
}
