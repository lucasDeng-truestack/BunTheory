"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, LogOut, ReceiptText, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { customerLabel, useCustomer } from "@/hooks/use-customer";

const pill =
  "inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-bun-ink bg-white font-display text-sm font-semibold text-bun-ink shadow-sticker transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bun-red/40 focus-visible:ring-offset-2";

/**
 * The nav's account control. Signed out: "Sign in". Signed in: an initial badge and the
 * customer's first name, opening a small menu with My orders and Sign out. While the sign-in is
 * being checked it holds its space, so the nav does not jump.
 */
export function AccountMenu({ className }: { className?: string }) {
  const customer = useCustomer();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (customer.status === "loading") {
    return <span aria-hidden className={cn("inline-block h-11 w-[96px]", className)} />;
  }

  if (customer.status === "guest") {
    return (
      <div className={className}>
        <Link href="/account" className={cn(pill, "whitespace-nowrap pl-3.5 pr-4 leading-none")}>
          <UserRound className="h-4 w-4 flex-none" aria-hidden />
          Sign in
        </Link>
      </div>
    );
  }

  const label = customerLabel(customer);
  return (
    <div ref={wrap} className={cn("relative", className)}>
      <button
        ref={button}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Account: ${label}`}
        className={cn(pill, "max-w-[190px] py-1 pl-1 pr-3")}
      >
        <span aria-hidden className="grid h-8 w-8 flex-none place-items-center rounded-full bg-bun-yellow font-bold uppercase text-bun-ink">
          {label.charAt(0)}
        </span>
        <span className="truncate">{label}</span>
        <ChevronDown aria-hidden className={cn("h-4 w-4 flex-none transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 grid w-64 gap-1 rounded-2xl border-2 border-bun-ink bg-white p-2 shadow-sticker"
        >
          <p className="truncate px-3 pb-2 pt-1.5 text-xs text-bun-ink-soft">{customer.email}</p>
          <Link
            role="menuitem"
            href="/account"
            onClick={() => setOpen(false)}
            className="flex min-h-11 items-center gap-3 rounded-xl px-3 font-display text-sm font-semibold text-bun-ink hover:bg-bun-cream-soft"
          >
            <ReceiptText className="h-4 w-4" aria-hidden />
            My orders
          </Link>
          <button
            role="menuitem"
            type="button"
            disabled={signingOut}
            onClick={async () => {
              setSigningOut(true);
              await customer.signOut();
              setSigningOut(false);
              setOpen(false);
            }}
            className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-left font-display text-sm font-semibold text-bun-ink hover:bg-bun-cream-soft"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            {signingOut ? "Signing out" : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}

/** The phone menu's account rows: Sign in, or My orders and Sign out with the email above. */
export function AccountMenuRows({ onNavigate }: { onNavigate: () => void }) {
  const customer = useCustomer();
  const row =
    "flex items-center gap-3 rounded-2xl px-4 py-3 font-display text-lg font-semibold text-bun-ink transition-colors hover:bg-bun-ink hover:text-bun-cream";
  if (customer.status === "loading") return null;
  if (customer.status === "guest") {
    return (
      <Link href="/account" onClick={onNavigate} className={row}>
        <UserRound className="h-5 w-5" aria-hidden />
        Sign in
      </Link>
    );
  }
  return (
    <>
      <p className="truncate px-4 pt-2 text-xs text-bun-ink-soft">Signed in as {customer.email}</p>
      <Link href="/account" onClick={onNavigate} className={row}>
        <ReceiptText className="h-5 w-5" aria-hidden />
        My orders
      </Link>
      <button
        type="button"
        onClick={async () => {
          await customer.signOut();
          onNavigate();
        }}
        className={cn(row, "text-left")}
      >
        <LogOut className="h-5 w-5" aria-hidden />
        Sign out
      </button>
    </>
  );
}
