"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLenis } from "lenis/react";
import { bookCta, nav } from "@/lib/content";
import { usePrefersReducedMotion } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Magnetic } from "@/components/magnetic";

/** "BAKAR & ROAST" set in the display face with an ember ampersand (no logo file yet). */
export function Wordmark({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex min-h-11 items-center font-display text-2xl font-extrabold uppercase leading-none text-cream no-underline [font-stretch:80%]",
        className,
      )}
    >
      Bakar <span className="text-ember">&amp;</span> Roast
    </Link>
  );
}

const isCurrent = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

/**
 * Site header. Desktop (1024px+): wordmark, centred links, ember "Check a date".
 * Phone: wordmark + round cream burger opening a full-screen ink-raised menu with numbered links.
 * Hides on scroll down, returns on scroll up, solid ink backing after 50px.
 * Static (never hides) on /catering/book. Not rendered on /admin.
 */
export function Header() {
  const pathname = usePathname() ?? "/";
  const reduce = usePrefersReducedMotion();
  const lenis = useLenis();
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);
  const [hidden, setHidden] = useState(false);
  const burger = useRef<HTMLButtonElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const isStatic = pathname.startsWith("/catering/book");
  const isAdmin = pathname.startsWith("/admin");

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setSolid(y > 50);
      setHidden(!isStatic && !reduce && y > lastY && y > 300);
      lastY = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isStatic, reduce]);

  useEffect(() => setOpen(false), [pathname]);

  // Menu open: lock page scroll (Lenis + native), trap Tab, Escape closes.
  useEffect(() => {
    if (!open) return;
    lenis?.stop();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        burger.current?.focus();
        return;
      }
      if (e.key !== "Tab" || !wrap.current) return;
      const items = Array.from(
        wrap.current.querySelectorAll<HTMLElement>("a[href], button"),
      ).filter((el) => el.getClientRects().length > 0);
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      lenis?.start();
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, lenis]);

  if (isAdmin) return null;

  return (
    <div ref={wrap}>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 border-b pt-[env(safe-area-inset-top)] transition-[transform,background-color,border-color] duration-500 ease-expo-out",
          solid || open ? "border-ink-line bg-ink" : "border-transparent bg-transparent",
          open && "border-transparent bg-ink-raised",
          hidden && !open && "-translate-y-[110%]",
        )}
      >
        <div className="mx-auto flex w-full max-w-content items-center justify-between gap-6 px-gutter py-3.5">
          <Wordmark />

          <nav aria-label="Main" className="hidden lg:block">
            <ul className="m-0 flex list-none gap-7 p-0">
              {nav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isCurrent(pathname, item.href) ? "page" : undefined}
                    className="inline-flex min-h-11 items-center text-[15px] font-semibold text-cream-muted no-underline transition-colors hover:text-cream aria-[current=page]:text-cream"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <Magnetic className="hidden lg:inline-block">
            <Button href={bookCta.href} size="md">
              {bookCta.label}
            </Button>
          </Magnetic>

          <button
            ref={burger}
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="site-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="relative grid h-12 w-12 place-items-center rounded-full bg-cream text-ink lg:hidden"
          >
            <span
              aria-hidden
              className={cn(
                "absolute h-0.5 w-[18px] bg-current transition-transform duration-500 ease-expo-out",
                open ? "rotate-45" : "-translate-y-[3.5px]",
              )}
            />
            <span
              aria-hidden
              className={cn(
                "absolute h-0.5 w-[18px] bg-current transition-transform duration-500 ease-expo-out",
                open ? "-rotate-45" : "translate-y-[3.5px]",
              )}
            />
          </button>
        </div>
      </header>

      <nav
        id="site-menu"
        aria-label="Menu"
        // Closed: off-screen and invisible, so nothing in it is tabbable.
        className={cn(
          "fixed inset-0 z-40 overflow-y-auto bg-ink-raised px-gutter pb-10 pt-[calc(96px+env(safe-area-inset-top))] lg:hidden",
          "transition-[transform,visibility] duration-900 ease-expo-in-out",
          open ? "visible translate-y-0" : "invisible -translate-y-full",
        )}
        data-lenis-prevent
      >
        <ul className="m-0 list-none p-0">
          {nav.map((item, i) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={isCurrent(pathname, item.href) ? "page" : undefined}
                className="display-md grid grid-cols-[40px_1fr] items-baseline border-b border-ink-line py-3.5 leading-[0.9] text-cream no-underline aria-[current=page]:text-ember"
              >
                <small className="type-eyebrow text-cream-faint">{String(i + 1).padStart(2, "0")}</small>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <Button href={bookCta.href} block className="mt-8" onClick={() => setOpen(false)}>
          {bookCta.label}
        </Button>
      </nav>
    </div>
  );
}
