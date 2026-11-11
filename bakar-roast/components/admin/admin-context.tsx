"use client";

import { createContext, useContext, useLayoutEffect } from "react";
import type { CateringBookingStatus } from "@/lib/api";
import type { AdminUser } from "@/lib/catering-api";

/** What the phone top bar shows instead of the section title (a request, an editor). */
export type TopBar = { title: string; back?: string; status?: CateringBookingStatus };

export type AdminContextValue = {
  token: string;
  admin: AdminUser;
  /** Pending requests, null until the first count arrives. Polled every 60s. */
  pending: number | null;
  refreshPending: () => void;
  /** Bun Theory orders not yet delivered, null until the first count arrives. Polled with pending. */
  ordersPending: number | null;
  refreshOrdersPending: () => void;
  /**
   * Call the API with the token. A 401 ends the session (keys cleared, off to the login with
   * "Your session ended") and the promise rejects; every other error is the caller's.
   */
  run: <T>(call: (token: string) => Promise<T>) => Promise<T>;
  signOut: () => void;
  setTopBar: (bar: TopBar | null) => void;
  /** The phone action bar element. Fill it with <AdminActionBar>. */
  actionSlot: HTMLElement | null;
  setHasActionBar: (on: boolean) => void;
};

export const AdminContext = createContext<AdminContextValue | null>(null);

/** Session, pending count and shell hooks for every screen inside the admin shell. */
export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used inside <AdminShell>");
  return ctx;
}

/**
 * Replace the phone top bar's title with a back button, a title and an optional status chip
 * while this screen is mounted. The admin renders on the client only, so a layout effect is safe.
 */
export function useAdminTopBar(bar: TopBar | null) {
  const { setTopBar } = useAdmin();
  const title = bar?.title;
  const back = bar?.back;
  const status = bar?.status;
  useLayoutEffect(() => {
    setTopBar(title === undefined ? null : { title, back, status });
    return () => setTopBar(null);
  }, [setTopBar, title, back, status]);
}
