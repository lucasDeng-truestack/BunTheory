import { getApiUrl } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

const PUBLIC_PATH_PREFIXES = ['/login', '/e-receipt'];

function isPublicRoute(pathname: string) {
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

let handlingUnauthorized = false;

/** Clears stored auth and sends staff back to login (not used on public guest pages). */
export function handleUnauthorized() {
  if (handlingUnauthorized || typeof window === 'undefined') return;

  const hadToken = localStorage.getItem('pos_token');
  if (!hadToken) return;

  handlingUnauthorized = true;
  useAuthStore.getState().logout();

  const path = window.location.pathname;
  if (!isPublicRoute(path)) {
    window.location.replace('/login?expired=1');
  }

  handlingUnauthorized = false;
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

  try {
    const res = await fetch(getApiUrl('/settings/admin'), {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 401) {
      handleUnauthorized();
      return false;
    }

    return res.ok;
  } catch {
    // Offline or network blip — keep local session so staff can retry.
    return true;
  }
}
