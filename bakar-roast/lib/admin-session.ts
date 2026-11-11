// Owner admin session: the staff session token from POST /auth/login and the admin object,
// kept in localStorage. Storage can throw (private mode, blocked site data), so every access
// is guarded. A 401 from any admin call means the session is gone.
import { ApiError } from "./api";
import type { AdminUser } from "./catering-api";

export const TOKEN_KEY = "br_admin_token";
export const ADMIN_KEY = "br_admin";

export type AdminSession = { token: string; admin: AdminUser };

/**
 * `session` when both keys are present. `ended` when the token is gone but the admin object is
 * still there (the session was cleared under us), so the login screen can say it ended.
 */
export function readSession(): { session: AdminSession | null; ended: boolean } {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const raw = localStorage.getItem(ADMIN_KEY);
    const admin = raw ? (JSON.parse(raw) as AdminUser) : null;
    if (token && admin?.email) return { session: { token, admin }, ended: false };
    return { session: null, ended: !!raw };
  } catch {
    return { session: null, ended: false };
  }
}

export function saveSession(s: AdminSession) {
  try {
    localStorage.setItem(TOKEN_KEY, s.token);
    localStorage.setItem(ADMIN_KEY, JSON.stringify(s.admin));
  } catch {}
}

export function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ADMIN_KEY);
  } catch {}
}

/** Only a 401 ends the session. A 403 (role cannot write) never does. */
export const isSessionGone = (err: unknown) => err instanceof ApiError && err.status === 401;

export const LOGIN_PATH = "/admin/login";
export const EXPIRED_PATH = "/admin/login?expired=1";
