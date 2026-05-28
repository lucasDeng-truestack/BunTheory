import { getApiUrl } from '@/lib/api';
import { isJwtExpired } from '@/lib/jwt-utils';
import { useAuthStore } from '@/store/auth.store';

const PUBLIC_PATH_PREFIXES = ['/login', '/e-receipt'];

function isPublicRoute(pathname: string) {
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

let forcingLogout = false;

/** Clears auth and hard-navigates staff to login. Idempotent while redirecting. */
export function forceStaffLogout(expired = false) {
  if (forcingLogout || typeof window === 'undefined') return;

  const path = window.location.pathname;
  if (isPublicRoute(path)) return;

  forcingLogout = true;
  useAuthStore.getState().logout();
  window.location.replace(expired ? '/login?expired=1' : '/login');
}

/** Clears stored auth and sends staff back to login (not used on public guest pages). */
export function handleUnauthorized() {
  if (typeof window === 'undefined') return;
  if (!localStorage.getItem('pos_token') && !useAuthStore.getState().token) return;
  forceStaffLogout(true);
}

/** Returns false when the token is missing or rejected by the API. */
export async function validateAuthSession(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const token =
    useAuthStore.getState().token ?? localStorage.getItem('pos_token');
  if (!token) {
    useAuthStore.getState().logout();
    return false;
  }

  if (isJwtExpired(token)) {
    forceStaffLogout(true);
    return false;
  }

  try {
    const res = await fetch(getApiUrl('/settings/admin'), {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 401) {
      forceStaffLogout(true);
      return false;
    }

    return res.ok;
  } catch {
    // Offline or network blip — keep local session so staff can retry.
    return true;
  }
}

/** Client-side expiry guard for active staff pages. */
export function assertStaffSessionLive(): boolean {
  if (typeof window === 'undefined') return false;

  const token =
    useAuthStore.getState().token ?? localStorage.getItem('pos_token');
  if (!token || isJwtExpired(token)) {
    forceStaffLogout(true);
    return false;
  }

  return true;
}
