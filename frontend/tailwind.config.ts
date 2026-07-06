import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
        display: [
          "var(--font-display)",
          "ui-serif",
          "Georgia",
          "Cambria",
          "serif",
        ],
      },
      fontSize: {
        /** Section / brand eyebrow — 14px floor for readability */
        eyebrow: [
          "0.875rem",
          { lineHeight: "1.25rem", letterSpacing: "0.08em" },
        ],
        /** CRAV-style oversized hero display sizes (fluid via clamp in usage). */
        "display-sm": ["2.75rem", { lineHeight: "0.95", letterSpacing: "-0.02em" }],
        "display-md": ["4rem", { lineHeight: "0.92", letterSpacing: "-0.025em" }],
        "display-lg": ["6rem", { lineHeight: "0.9", letterSpacing: "-0.03em" }],
      },
      keyframes: {
        dialogOverlayIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        dialogOverlayOut: {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        dialogContentIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        dialogContentOut: {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        dialogSheetIn: {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        dialogSheetOut: {
          from: { transform: "translateY(0)" },
          to: { transform: "translateY(100%)" },
        },
        fadeInUp: {
          from: { opacity: "0", transform: "translateY(24px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        /** Slow marquee for CRAV-style scrolling promo/ticker strips. */
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        /** Loading splash: brand mark pops in then holds. */
        splashPop: {
          "0%": { opacity: "0", transform: "scale(0.7) rotate(-6deg)" },
          "60%": { opacity: "1", transform: "scale(1.06) rotate(2deg)" },
          "100%": { opacity: "1", transform: "scale(1) rotate(0deg)" },
        },
        /** Gentle wobble for sticker/badge overlays. */
        wobble: {
          "0%, 100%": { transform: "rotate(var(--sticker-rot, -8deg))" },
          "50%": { transform: "rotate(calc(var(--sticker-rot, -8deg) + 4deg))" },
        },
      },
      animation: {
        "dialog-overlay-in": "dialogOverlayIn 0.2s ease-out forwards",
        "dialog-overlay-out": "dialogOverlayOut 0.2s ease-in forwards",
        "dialog-content-in": "dialogContentIn 0.22s ease-out forwards",
        "dialog-content-out": "dialogContentOut 0.18s ease-in forwards",
        "dialog-sheet-in":
          "dialogSheetIn 0.32s cubic-bezier(0.32, 0.72, 0, 1) forwards",
        "dialog-sheet-out":
          "dialogSheetOut 0.26s cubic-bezier(0.32, 0.72, 0, 1) forwards",
        "fade-in-up": "fadeInUp 0.6s ease-out forwards",
        marquee: "marquee 22s linear infinite",
        "splash-pop": "splashPop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        wobble: "wobble 3.5s ease-in-out infinite",
      },
      colors: {
        /* ──────────────────────────────────────────────────────────────
         * CRAV-inspired Bun Theory palette. `bun-*` are the canonical names
         * for new components; the legacy semantic names below (roast-red,
         * mustard, cream, ink…) are retuned to the same values so existing
         * pages keep rendering while phases are rebuilt.
         * ────────────────────────────────────────────────────────────── */
        bun: {
          red: "#E4322B",
          "red-deep": "#B4160E",
          yellow: "#FFC12B",
          "yellow-soft": "#FFD65C",
          cream: "#FCEBCE",
          "cream-soft": "#FFF6E4",
          black: "#17120E",
          ink: "#2A201A",
          "ink-soft": "#6B5B4E",
        },

        /* ── Legacy semantic aliases (retuned toward CRAV) ── */
        "roast-red": "#E4322B",
        "deep-red": "#B4160E",
        "accent-orange": "#E86A33",
        "warm-cream": "#FCEBCE",
        charcoal: "#1f2937",
        "burnt-brown": "#7c2d12",
        mustard: "#FFC12B",
        cream: "#FFF6E4",
        /** Warm near-black for primary text/headlines. */
        ink: "#2A201A",
        /** Softer warm ink for secondary text. */
        "ink-soft": "#6B5B4E",
        /** Warm cream page background. */
        paper: "#FCEBCE",
        /** Elevated card/panel surface. */
        surface: "#ffffff",
        /** Recessed / muted surface. */
        "surface-muted": "#FFF0D6",
        /** Hairline borders/dividers. */
        hairline: "rgba(36, 26, 21, 0.10)",
        "hairline-strong": "rgba(36, 26, 21, 0.16)",
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      letterSpacing: {
        eyebrow: "0.18em",
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      boxShadow: {
        elevated:
          "0 4px 24px -4px rgba(31, 41, 55, 0.12), 0 8px 16px -8px rgba(185, 28, 28, 0.08)",
        card: "0 1px 3px rgba(31, 41, 55, 0.12), 0 8px 24px -8px rgba(31, 41, 55, 0.12)",
        "card-hover":
          "0 8px 32px -4px rgba(31, 41, 55, 0.15), 0 16px 24px -8px rgba(122, 12, 12, 0.08)",
        hero: "0 8px 40px -8px rgba(122, 12, 12, 0.15), 0 16px 32px -16px rgba(31, 41, 55, 0.1)",
        /* ── Premium soft elevation (larger, lower-opacity, warm) ── */
        soft: "0 2px 8px -2px rgba(36, 26, 21, 0.06), 0 12px 32px -12px rgba(36, 26, 21, 0.10)",
        lift: "0 8px 24px -8px rgba(36, 26, 21, 0.12), 0 24px 48px -24px rgba(122, 12, 12, 0.14)",
        /* ── CRAV hard-edged "sticker" shadows (solid offset, no blur) ── */
        sticker: "4px 4px 0 0 rgba(23, 18, 14, 1)",
        "sticker-lg": "6px 6px 0 0 rgba(23, 18, 14, 1)",
        "sticker-red": "5px 5px 0 0 #B4160E",
      },
    },
  },
  plugins: [],
};
export default config;
