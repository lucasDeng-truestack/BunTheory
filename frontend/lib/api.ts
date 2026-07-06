const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function api<T>(
  path: string,
  options?: RequestInit & { token?: string; next?: NextFetchRequestConfig }
): Promise<T> {
  const { token, next, ...init } = options || {};
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    // Default to no-store, but when a caller opts into ISR via `next`
    // (e.g. { revalidate }) let Next control caching instead.
    cache: init.cache ?? (next ? undefined : "no-store"),
    ...init,
    ...(next ? { next } : {}),
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    const raw = err?.message ?? err?.error;
    const message = Array.isArray(raw) ? raw.join(" ") : String(raw || res.statusText);
    throw new Error(message || "Request failed");
  }
  return res.json();
}
