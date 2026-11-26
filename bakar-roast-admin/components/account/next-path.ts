// No imports: this file is checked directly with `node --experimental-strip-types`.

const BASE = "http://next.invalid";

/**
 * Where `/account?next=` may send a customer after sign-in: the booking flow or a status page
 * on this site, nothing else (no open redirect). The URL parser resolves `..`, `\` and `//`
 * first, so the allow-list is tested on the path the browser would really open.
 * Returns the normalised path (with its query), or null.
 */
export function safeNext(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.startsWith("/")) return null;
  let url: URL;
  try {
    url = new URL(raw, BASE);
  } catch {
    return null;
  }
  if (url.origin !== BASE) return null;
  const path = url.pathname;
  if (path !== "/catering/book" && !/^\/booking\/[^/]+$/.test(path)) return null;
  return path + url.search;
}
