"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, LogOut, ReceiptText, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { customerLabel, useCustomer } from "@/components/account/use-customer";

/**
 * The header's account control. Signed out: "Sign in". Signed in: an initial badge and the
 * customer's first name, opening a small menu with My orders and Sign out. While the sign-in is
 * being checked it holds its space, so the header does not jump.
 */
export function AccountMenu({ className }: { className?: string }) {
  const customer = useCustomer();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  // Click outside or Escape closes the menu.
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
    return <span aria-hidden className={cn("inline-block h-12 w-[104px]", className)} />;
  }

  if (customer.status === "guest") {
    return (
      <div className={className}>
        <Link
          href="/account"
          className="inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-full border border-cream-faint pl-4 pr-5 text-[15px] font-semibold leading-none text-cream no-underline transition-colors hover:border-cream hover:bg-cream/5"
        >
          <UserRound aria-hidden size={18} strokeWidth={1.75} className="flex-none" />
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
        className="inline-flex h-12 max-w-[200px] items-center gap-2 rounded-full border border-cream-faint py-1.5 pl-1.5 pr-3 text-[15px] font-semibold text-cream transition-colors hover:border-cream"
      >
        <span aria-hidden className="grid h-9 w-9 flex-none place-items-center rounded-full bg-ember text-[15px] font-bold uppercase text-ink">
          {label.charAt(0)}
        </span>
        <span className="truncate">{label}</span>
        <ChevronDown aria-hidden size={16} className={cn("flex-none transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 grid w-64 gap-1 rounded-card-sm border border-ink-line bg-ink-raised p-2 shadow-xl"
        >
          <p className="m-0 truncate px-3 pb-2 pt-1.5 text-[13px] text-cream-muted">{customer.email}</p>
          <Link
            role="menuitem"
            href="/account"
            onClick={() => setOpen(false)}
            className="flex min-h-11 items-center gap-3 rounded-[10px] px-3 font-semibold text-cream no-underline hover:bg-ink-line"
          >
            <ReceiptText aria-hidden size={18} strokeWidth={1.75} />
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
            className="flex min-h-11 items-center gap-3 rounded-[10px] px-3 text-left font-semibold text-cream hover:bg-ink-line"
          >
            <LogOut aria-hidden size={18} strokeWidth={1.75} />
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
    "flex min-h-12 items-center gap-3 rounded-card-sm border border-ink-line px-4 font-semibold text-cream no-underline";
  if (customer.status === "loading") return null;
  if (customer.status === "guest") {
    return (
      <Link href="/account" onClick={onNavigate} className={row}>
        <UserRound aria-hidden size={18} strokeWidth={1.75} />
        Sign in
      </Link>
    );
  }
  return (
    <div className="grid gap-2">
      <p className="m-0 truncate text-[13px] text-cream-muted">Signed in as {customer.email}</p>
      <Link href="/account" onClick={onNavigate} className={row}>
        <ReceiptText aria-hidden size={18} strokeWidth={1.75} />
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
        <LogOut aria-hidden size={18} strokeWidth={1.75} />
        Sign out
      </button>
    </div>
  );
}
