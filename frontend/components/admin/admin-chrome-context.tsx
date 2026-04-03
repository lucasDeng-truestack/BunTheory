"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { getSettings } from "@/services/admin.service";
import { getPendingOrdersCount } from "@/services/orders.service";

export type AdminBranding = {
  companyName: string | null;
  companyLogoUrl: string | null;
};

type AdminChromeContextValue = {
  branding: AdminBranding;
  refreshBranding: () => Promise<void>;
  /** Orders with status other than DELIVERED (0 when logged out / error). */
  pendingOrdersCount: number;
  refreshPendingOrdersCount: () => Promise<void>;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  toggleSidebar: () => void;
};

const defaultBranding: AdminBranding = {
  companyName: null,
  companyLogoUrl: null,
};

const AdminChromeContext = createContext<AdminChromeContextValue | null>(null);

export function AdminChromeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [branding, setBranding] = useState<AdminBranding>(defaultBranding);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setSidebarCollapsed(localStorage.getItem("admin_sidebar_collapsed") === "1");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      "admin_sidebar_collapsed",
      sidebarCollapsed ? "1" : "0"
    );
  }, [sidebarCollapsed]);

  const refreshBranding = useCallback(async () => {
    const t =
      typeof window !== "undefined"
        ? localStorage.getItem("admin_token")
        : null;
    if (!t) return;
    try {
      const s = await getSettings(t);
      setBranding({
        companyName: s.companyName ?? null,
        companyLogoUrl: s.companyLogoUrl ?? null,
      });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void refreshBranding();
  }, [refreshBranding]);

  const refreshPendingOrdersCount = useCallback(async () => {
    const t =
      typeof window !== "undefined"
        ? localStorage.getItem("admin_token")
        : null;
    if (!t) {
      setPendingOrdersCount(0);
      return;
    }
    try {
      const n = await getPendingOrdersCount(t);
      setPendingOrdersCount(n);
    } catch {
      setPendingOrdersCount(0);
    }
  }, []);

  useEffect(() => {
    void refreshPendingOrdersCount();
  }, [pathname, refreshPendingOrdersCount]);

  useEffect(() => {
    const id = window.setInterval(() => void refreshPendingOrdersCount(), 45_000);
    return () => window.clearInterval(id);
  }, [refreshPendingOrdersCount]);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((c) => !c);
  }, []);

  const value = useMemo<AdminChromeContextValue>(
    () => ({
      branding,
      refreshBranding,
      pendingOrdersCount,
      refreshPendingOrdersCount,
      sidebarCollapsed,
      setSidebarCollapsed,
      toggleSidebar,
    }),
    [
      branding,
      refreshBranding,
      pendingOrdersCount,
      refreshPendingOrdersCount,
      sidebarCollapsed,
      toggleSidebar,
    ]
  );

  return (
    <AdminChromeContext.Provider value={value}>
      {children}
    </AdminChromeContext.Provider>
  );
}

export function useAdminChrome() {
  const ctx = useContext(AdminChromeContext);
  if (!ctx) {
    throw new Error("useAdminChrome must be used within AdminChromeProvider");
  }
  return ctx;
}

/** Optional hook for components that may render outside the provider (e.g. tests). */
export function useAdminChromeOptional() {
  return useContext(AdminChromeContext);
}
