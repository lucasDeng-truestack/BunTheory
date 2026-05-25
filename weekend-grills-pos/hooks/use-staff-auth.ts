'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { validateAuthSession } from '@/lib/auth-session';
import { useAuthStore } from '@/store/auth.store';

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
    void validateAuthSession().then(() => {
      if (!cancelled) setSessionReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [hydrated, isAuthenticated]);

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
