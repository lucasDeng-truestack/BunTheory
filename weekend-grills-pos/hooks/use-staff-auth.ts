'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  assertStaffSessionLive,
  forceStaffLogout,
  validateAuthSession,
} from '@/lib/auth-session';
import { useAuthStore } from '@/store/auth.store';

const SESSION_POLL_MS = 15_000;

/**
 * Hydrates auth from storage, validates JWT with the API, and redirects to login when needed.
 */
export function useStaffAuth() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hydrated = useAuthStore((s) => s.hydrated);
  const admin = useAuthStore((s) => s.admin);
  const hydrate = useAuthStore((s) => s.hydrate);
  const logout = useAuthStore((s) => s.logout);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;

    if (!isAuthenticated) {
      setSessionReady(true);
      return;
    }

    let cancelled = false;

    async function verifySession() {
      if (!assertStaffSessionLive()) return;

      const valid = await validateAuthSession();
      if (cancelled) return;

      if (!valid) {
        forceStaffLogout(true);
        return;
      }

      setSessionReady(true);
    }

    void verifySession();

    return () => {
      cancelled = true;
    };
  }, [hydrated, isAuthenticated]);

  useEffect(() => {
    if (!hydrated || !sessionReady || !isAuthenticated) return;

    function guardSession() {
      assertStaffSessionLive();
    }

    guardSession();
    const intervalId = window.setInterval(guardSession, SESSION_POLL_MS);

    function onVisible() {
      if (document.visibilityState !== 'visible') return;
      if (!assertStaffSessionLive()) return;
      void validateAuthSession();
    }

    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [hydrated, sessionReady, isAuthenticated]);

  useEffect(() => {
    if (!hydrated || !sessionReady) return;
    if (!useAuthStore.getState().isAuthenticated) {
      router.replace('/login');
    }
  }, [hydrated, sessionReady, isAuthenticated, router]);

  function signOut() {
    logout();
    router.replace('/login');
  }

  const ready = hydrated && sessionReady && isAuthenticated;

  return { ready, logout: signOut, admin };
}
