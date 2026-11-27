"use client";

import { useCallback, useEffect, useState } from "react";
import { authClient, clearAuthToken, getAuthToken } from "@/lib/auth-client";

export type CustomerStatus = "loading" | "guest" | "signed-in";

type State = { status: CustomerStatus; email: string; name: string; token: string };

const GUEST: State = { status: "guest", email: "", name: "", token: "" };

/** Fired on window when this tab signs in or out, so every useCustomer on the page follows. */
const CHANGED = "customer-session-changed";

/**
 * The optional customer sign-in. Server and first client render are both "loading"; the stored
 * bearer token is read in an effect only. Signed in means a stored token AND a live session for
 * it. The token is cleared only on a definite answer (the session came back empty or 401), never
 * on a network failure. `refresh()` re-reads after sign-in; every other copy of this hook on the
 * page (the header, the account page, checkout) follows, in this tab and in other tabs.
 */
export function useCustomer() {
  const [state, setState] = useState<State>({ ...GUEST, status: "loading" });

  const read = useCallback(async (): Promise<void> => {
    const token = getAuthToken();
    if (!token) return setState(GUEST);
    try {
      const { data, error } = await authClient.getSession();
      // A sign-in landed while this check was in flight: check the new token instead.
      if (getAuthToken() !== token) return read();
      const user = data?.user;
      if (user) {
        // A first code sign-in leaves the name empty (or the email); callers fall back.
        const name = user.name && user.name !== user.email && !user.name.includes("@") ? user.name : "";
        return setState({ status: "signed-in", email: user.email, name, token });
      }
      if (!error || error.status === 401) clearAuthToken();
      setState(GUEST);
    } catch {
      setState(GUEST);
    }
  }, []);

  const refresh = useCallback(async () => {
    await read();
    window.dispatchEvent(new Event(CHANGED));
  }, [read]);

  useEffect(() => {
    void read();
    const onChange = () => void read();
    // Another tab signed in or out (the token lives in localStorage).
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || /token/i.test(e.key)) void read();
    };
    window.addEventListener(CHANGED, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CHANGED, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [read]);

  const signOut = useCallback(async () => {
    try {
      await authClient.signOut();
    } catch {}
    clearAuthToken();
    setState(GUEST);
    window.dispatchEvent(new Event(CHANGED));
  }, []);

  return { ...state, refresh, signOut };
}

/** What to call a signed-in customer: their first name, else the part of the email before @. */
export function customerLabel(c: { name: string; email: string }): string {
  return c.name.trim().split(/\s+/)[0] || c.email.split("@")[0] || "Account";
}
