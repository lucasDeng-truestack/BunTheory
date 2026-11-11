"use client";

import { useCallback, useEffect, useState } from "react";
import { authClient, clearAuthToken, getAuthToken } from "@/lib/auth-client";

export type CustomerStatus = "loading" | "guest" | "signed-in";

type State = { status: CustomerStatus; email: string; name: string; token: string };

const GUEST: State = { status: "guest", email: "", name: "", token: "" };

/**
 * The optional customer sign-in, for one component. Server and first client render are both
 * "loading"; the stored bearer token (localStorage `br_token`) is read in an effect only.
 * Signed in means a stored token AND a live session for it. The token is cleared only on a
 * definite answer (the session came back empty or 401), never on a network failure.
 * `refresh()` re-reads after sign-in or after a caller cleared a dead token.
 */
export function useCustomer() {
  const [state, setState] = useState<State>({ ...GUEST, status: "loading" });

  const refresh = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return setState(GUEST);
    try {
      const { data, error } = await authClient.getSession();
      // A sign-in landed while this check was in flight: check the new token instead.
      if (getAuthToken() !== token) return refresh();
      const user = data?.user;
      if (user) {
        // A first code sign-in leaves the name empty; callers fall back to the last booking's.
        const name = user.name && user.name !== user.email ? user.name : "";
        return setState({ status: "signed-in", email: user.email, name, token });
      }
      if (!error || error.status === 401) clearAuthToken();
      setState(GUEST);
    } catch {
      setState(GUEST);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    try {
      await authClient.signOut();
    } catch {}
    clearAuthToken();
    setState(GUEST);
  }, []);

  return { ...state, refresh, signOut };
}
