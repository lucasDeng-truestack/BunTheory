"use client";

import { useEffect, useState } from "react";

/**
 * True only after the client has mounted. Use to avoid SSR/client HTML mismatches
 * for state that only exists in the browser (e.g. zustand persist, PhoneInput).
 */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);
  return hydrated;
}
