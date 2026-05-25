import { handleUnauthorized } from '@/lib/auth-session';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export function getApiUrl(path: string) {
  return `${API_BASE}${path}`;
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('pos_token');
}

function extractNestMessage(body: unknown): string | undefined {
  if (typeof body !== 'object' || body === null) return undefined;
  const raw = (body as Record<string, unknown>).message;
  if (typeof raw === 'string' && raw.trim()) return raw;
  if (Array.isArray(raw)) {
    const msg = raw.map(String).join('. ');
    return msg.trim() || undefined;
  }
  return undefined;
}

function formatApiMessage(body: unknown, status: number): string {
  if (status === 401) {
    return 'Session expired — log in again.';
  }
  return extractNestMessage(body) ?? `Request failed (${status})`;
}

/** Errors for endpoints that never use staff Bearer auth (guest e‑receipt, etc.). */
function formatPublicApiMessage(body: unknown, status: number): string {
  const extracted = extractNestMessage(body);
  if (extracted) return extracted;
  if (status === 401) {
    return 'This receipt link is invalid or corrupted. Ask staff for a fresh QR.';
  }
  return `Request failed (${status})`;
}

/** Unauthenticated GET (e-receipt lookup, etc.). No Bearer token attached. */
export async function fetchPublicJson<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(getApiUrl(path), {
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new Error(
      `Cannot reach API at ${API_BASE}. Start the Nest backend or set NEXT_PUBLIC_API_URL.`,
    );
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(formatPublicApiMessage(body, res.status));
  }

  return res.json() as Promise<T>;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(getApiUrl(path), { ...options, headers });
  } catch {
    throw new Error(
      `Cannot reach API at ${API_BASE}. Start the Nest backend or set NEXT_PUBLIC_API_URL.`,
    );
  }

  if (!res.ok) {
    if (res.status === 401 && token) {
      handleUnauthorized();
    }
    const body = await res.json().catch(() => ({}));
    throw new Error(formatApiMessage(body, res.status));
  }

  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
