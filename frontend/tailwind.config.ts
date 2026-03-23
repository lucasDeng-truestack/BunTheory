import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
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
      },
      animation: {
        "dialog-overlay-in": "dialogOverlayIn 0.2s ease-out forwards",
        "dialog-overlay-out": "dialogOverlayOut 0.2s ease-in forwards",
        "dialog-content-in": "dialogContentIn 0.22s ease-out forwards",
        "dialog-content-out": "dialogContentOut 0.18s ease-in forwards",
        "dialog-sheet-in": "dialogSheetIn 0.32s cubic-bezier(0.32, 0.72, 0, 1) forwards",
        "dialog-sheet-out": "dialogSheetOut 0.26s cubic-bezier(0.32, 0.72, 0, 1) forwards",
      },
      colors: {
        "roast-red": "#b91c1c",
        charcoal: "#1f2937",
        "burnt-brown": "#7c2d12",
        mustard: "#f59e0b",
        cream: "#fff7ed",
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      boxShadow: {
        elevated: "0 4px 24px -4px rgba(31, 41, 55, 0.12), 0 8px 16px -8px rgba(185, 28, 28, 0.08)",
        card: "0 1px 3px rgba(31, 41, 55, 0.12), 0 8px 24px -8px rgba(31, 41, 55, 0.12)",
      },
    },
  },
  plugins: [],
};
export default config;
