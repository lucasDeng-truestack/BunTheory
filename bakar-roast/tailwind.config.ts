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
        // Theme-aware. Each value is an RGB channel variable set per theme in globals.css
        // (dark is the default, html[data-theme="light"] flips it). "ink" is the surface family
        // and "cream" the text family in both themes, so class names never change.
        ink: {
          DEFAULT: "rgb(var(--ink) / <alpha-value>)",
          soft: "rgb(var(--ink-soft) / <alpha-value>)",
          raised: "rgb(var(--ink-raised) / <alpha-value>)",
          line: "rgb(var(--ink-line) / <alpha-value>)",
        },
        cream: {
          DEFAULT: "rgb(var(--cream) / <alpha-value>)",
          muted: "rgb(var(--cream-muted) / <alpha-value>)",
          faint: "rgb(var(--cream-faint) / <alpha-value>)",
        },
        ember: {
          DEFAULT: "rgb(var(--ember) / <alpha-value>)",
          bright: "rgb(var(--ember-bright) / <alpha-value>)",
          heat: "rgb(var(--ember-heat) / <alpha-value>)",
          glow: "rgb(var(--ember-glow) / <alpha-value>)",
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
