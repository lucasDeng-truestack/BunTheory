"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  UtensilsCrossed,
  ShoppingBag,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminNav() {
  const pathname = usePathname();

  if (pathname === "/admin/login") return null;

  const navItems = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
    { href: "/admin/menu", label: "Menu", icon: UtensilsCrossed },
  ];

  return (
    <nav
      className="flex max-w-[min(100vw-10rem,42rem)] flex-wrap items-center justify-end gap-1 rounded-2xl border border-charcoal/10 bg-charcoal/[0.04] p-1 sm:max-w-none sm:flex-nowrap"
      aria-label="Admin"
    >
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Button
            key={href}
            variant={active ? "default" : "ghost"}
            size="sm"
            className={cn(
              "rounded-xl px-2.5 sm:px-3",
              active && "shadow-sm"
            )}
            asChild
          >
            <Link href={href}>
              <Icon className="mr-1.5 h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          </Button>
        );
      })}
      <Button variant="ghost" size="sm" className="rounded-xl px-2.5 sm:px-3" asChild>
        <Link href="/">
          <LogOut className="mr-1.5 h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Exit</span>
        </Link>
      </Button>
    </nav>
  );
}
