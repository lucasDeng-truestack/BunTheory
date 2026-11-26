"use client";

import { useCallback, useEffect, useRef, useState, type DependencyList } from "react";
import { isSessionGone } from "@/lib/admin-session";
import { useAdmin } from "@/components/admin/admin-context";

/**
 * Load admin data once per `deps`, with loading, error and the 401 hand-off in one place.
 * `reload()` keeps the current data on screen while it refetches (no skeleton flash after a save).
 * Show the skeleton only when `loading && data === undefined`. A 401 never surfaces as an error:
 * the shell is already redirecting to the login.
 */
export function useAdminQuery<T>(load: (token: string) => Promise<T>, deps: DependencyList) {
  const { run } = useAdmin();
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const seq = useRef(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetcher = useCallback(load, deps);

  const reload = useCallback(() => {
    const id = ++seq.current;
    setLoading(true);
    setError(null);
    return run(fetcher).then(
      (d) => {
        if (id !== seq.current) return;
        setData(d);
        setLoading(false);
      },
      (err) => {
        if (id !== seq.current || isSessionGone(err)) return;
        setError(err);
        setLoading(false);
      },
    );
  }, [run, fetcher]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, loading, reload, setData };
}
