"use client";

import { usePathname } from "next/navigation";
import { AdminChromeProvider } from "@/components/admin/admin-chrome-context";
import { AdminLayoutInner } from "@/components/admin/admin-layout-inner";

type AdminLayoutShellProps = {
  children: React.ReactNode;
};

export function AdminLayoutShell({ children }: AdminLayoutShellProps) {
  const pathname = usePathname();
  const isLogin = pathname === "/admin/login";

  if (isLogin) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream via-white to-cream/90 text-base leading-relaxed text-charcoal">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream via-white to-cream/90 text-base leading-relaxed text-charcoal">
      <AdminChromeProvider>
        <AdminLayoutInner>{children}</AdminLayoutInner>
      </AdminChromeProvider>
    </div>
  );
}
