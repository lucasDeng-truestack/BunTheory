"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Light and dark theme. Dark is the brand default. The choice is kept per device in
 * localStorage and applied as <html data-theme="light"> by the inline script below, which runs
 * before first paint so a light page never flashes dark. globals.css holds both palettes.
 * Photo and fire surfaces that must stay dark wrap themselves in data-theme="dark".
 */

export type Theme = "dark" | "light";

const KEY = "br-theme";
const EVENT = "br-theme-change";

const SCRIPT = `(function(){try{if(localStorage.getItem(${JSON.stringify(KEY)})==="light")document.documentElement.setAttribute("data-theme","light")}catch(e){}})()`;

/** Render once, first thing in <body>. */
export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}

const readTheme = (): Theme =>
  typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";

function applyTheme(theme: Theme) {
  const html = document.documentElement;
  if (theme === "light") html.setAttribute("data-theme", "light");
  else html.removeAttribute("data-theme");
  try {
    localStorage.setItem(KEY, theme);
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

/** The current theme. "dark" on the server and first render, then the real value after mount. */
export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = useState<Theme>("dark");
  useEffect(() => {
    const sync = () => setTheme(readTheme());
    sync();
    window.addEventListener(EVENT, sync);
    // Another tab changed it.
    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEY) return;
      const next: Theme = e.newValue === "light" ? "light" : "dark";
      if (next === "light") document.documentElement.setAttribute("data-theme", "light");
      else document.documentElement.removeAttribute("data-theme");
      sync();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return [theme, applyTheme];
}

/**
 * Round button that switches between light and dark. `variant="row"` is the admin menu
 * version: icon plus a text label, full width.
 */
export function ThemeToggle({ variant = "icon", className }: { variant?: "icon" | "row"; className?: string }) {
  const [theme, setTheme] = useTheme();
  const next: Theme = theme === "dark" ? "light" : "dark";
  const label = next === "light" ? "Switch to light mode" : "Switch to dark mode";
  const Icon = theme === "dark" ? Sun : Moon;

  if (variant === "row") {
    return (
      <button
        type="button"
        onClick={() => setTheme(next)}
        aria-label={label}
        className={cn(
          "flex min-h-11 w-full items-center gap-3 rounded-[12px] px-3 font-semibold text-cream-muted transition-colors hover:text-cream",
          className,
        )}
      >
        <Icon aria-hidden size={20} strokeWidth={1.6} className="flex-none" />
        {next === "light" ? "Light mode" : "Dark mode"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={label}
      title={label}
      className={cn(
        "grid h-12 w-12 flex-none place-items-center rounded-full text-cream shadow-[inset_0_0_0_1px_theme(colors.cream.faint)] transition-shadow hover:shadow-[inset_0_0_0_1px_theme(colors.cream.DEFAULT)]",
        className,
      )}
    >
      <Icon aria-hidden size={20} strokeWidth={1.75} />
    </button>
  );
}
