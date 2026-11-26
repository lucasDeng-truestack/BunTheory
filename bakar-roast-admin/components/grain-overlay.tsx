"use client";

import { usePathname } from "next/navigation";

/** Fixed film grain for public pages. The admin is plain: no grain there. */
export function GrainOverlay() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  return <div className="grain" aria-hidden="true" />;
}
