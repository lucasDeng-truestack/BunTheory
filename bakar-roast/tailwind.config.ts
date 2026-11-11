import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0B0908",
          soft: "#141010",
          raised: "#1C1614",
          line: "#2A211D",
        },
        cream: {
          DEFAULT: "#F4ECE1",
          muted: "#C7B9A8",
          faint: "#8A7C6E",
        },
        ember: {
          DEFAULT: "#E86A1C",
          bright: "#F59E0B",
          heat: "#C0341E",
          glow: "#FF8A3D",
        },
        // Band-aware colours. <Band tone="cream"> (or any [data-tone="cream"])
        // flips these, so accents, eyebrows and focus rings follow the band.
        tone: {
          accent: "var(--tone-accent)",
          muted: "var(--tone-muted)",
          ring: "var(--tone-ring)",
        },
      },
      // Design radii. Named "card-*" so Tailwind's built-in rounded-sm/md/lg stay as they were.
      borderRadius: {
        "card-sm": "16px",
        "card-md": "24px",
        "card-lg": "36px",
      },
      spacing: {
        gutter: "clamp(18px, 4vw, 56px)",
        "gutter-phone": "18px",
        "gutter-desktop": "56px",
        section: "clamp(88px, 12vw, 176px)",
        "section-phone": "88px",
        "section-desktop": "176px",
        control: "56px",
        tap: "44px",
      },
      maxWidth: {
        content: "1440px",
      },
      boxShadow: {
        "glow-ember": "0 0 120px 24px rgba(232, 106, 28, 0.28)",
      },
      transitionTimingFunction: {
        "expo-out": "cubic-bezier(.16, 1, .3, 1)",
        "expo-in-out": "cubic-bezier(.76, 0, .24, 1)",
      },
      transitionDuration: {
        800: "800ms",
        900: "900ms",
      },
      fontFamily: {
        display: ["var(--font-display)", "Arial Narrow", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      keyframes: {
        shimmer: {
          to: { backgroundPosition: "-200% 0" },
        },
        "fade-in": {
          from: { opacity: "0" },
        },
        // Hero entrance (motion.md): letters rise and rotate up, photo settles, side fades up.
        rise: {
          from: { transform: "translateY(110%) rotate(9deg)" },
        },
        settle: {
          from: { transform: "scale(1.35)" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(50px)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.6s linear infinite",
        "fade-in": "fade-in 0.2s ease-out",
        rise: "rise 0.9s cubic-bezier(.16, 1, .3, 1) both",
        settle: "settle 1.6s cubic-bezier(.16, 1, .3, 1) both",
        "fade-up": "fade-up 0.8s cubic-bezier(.16, 1, .3, 1) both",
        "spin-slow": "spin 16s linear infinite",
        "spin-fast": "spin 0.8s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
