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
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      fontSize: {
        /** Section / brand eyebrow — 14px floor for readability */
        eyebrow: [
          "0.875rem",
          { lineHeight: "1.25rem", letterSpacing: "0.08em" },
        ],
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
      },
      colors: {
        "roast-red": "#b91c1c",
        "deep-red": "#7A0C0C",
        "accent-orange": "#E86A33",
        "warm-cream": "#FFF5E6",
        charcoal: "#1f2937",
        "burnt-brown": "#7c2d12",
        mustard: "#f59e0b",
        cream: "#fff7ed",
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      boxShadow: {
        elevated:
          "0 4px 24px -4px rgba(31, 41, 55, 0.12), 0 8px 16px -8px rgba(185, 28, 28, 0.08)",
        card: "0 1px 3px rgba(31, 41, 55, 0.12), 0 8px 24px -8px rgba(31, 41, 55, 0.12)",
        "card-hover":
          "0 8px 32px -4px rgba(31, 41, 55, 0.15), 0 16px 24px -8px rgba(122, 12, 12, 0.08)",
        hero: "0 8px 40px -8px rgba(122, 12, 12, 0.15), 0 16px 32px -16px rgba(31, 41, 55, 0.1)",
      },
    },
  },
  plugins: [],
};
export default config;
