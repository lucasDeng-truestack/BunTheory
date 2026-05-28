import { getApiUrl } from '@/lib/api';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  admin: { id: string; email: string; displayName?: string | null };
}

function loginErrorMessage(body: unknown, status: number): string {
  if (typeof body === 'object' && body !== null) {
    const raw = (body as Record<string, unknown>).message;
    if (typeof raw === 'string' && raw.trim()) return raw;
    if (Array.isArray(raw)) {
      const msg = raw.map(String).join('. ').trim();
      if (msg) return msg;
    }
  }
  if (status === 401) return 'Invalid email or password';
  return `Login failed (${status})`;
}

export const authService = {
  /** Never attach a stored Bearer token — avoids clearing session on wrong password. */
  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    let res: Response;
    try {
      res = await fetch(getApiUrl('/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch {
      throw new Error(
        'Cannot reach the server. Check your connection or API URL.',
      );
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(loginErrorMessage(body, res.status));
    }

    return res.json() as Promise<AuthResponse>;
  },
};
