import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, Fredoka } from "next/font/google";
import { Toaster } from "sonner";
import { NavigationLoadingGate } from "@/components/layout/navigation-loading-gate";
import { CartSync } from "@/components/providers/cart-sync";
import { MotionProvider } from "@/components/providers/motion-provider";
import { cn } from "@/lib/utils";
import { BRAND_FULL_NAME, BRAND_TITLE_LINE } from "@/lib/brand";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const SITE_DESCRIPTION =
  "Fire-roasted buns, made to order. Browse the batch, build your order, and pick up or get it delivered — no app, no account.";

/**
 * Body / UI / data — Hanken Grotesk: a warm humanist grotesque with real
 * character (deliberately not Inter/Roboto), yet legible down to dense admin
 * tables. Pairs with Fredoka's roundness without competing with it.
 */
const fontSans = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

/**
 * Display / headlines — Fredoka, a thick, rounded variable display face. Reads
 * loud + playful (fire-roasted comfort food) and takes an outline stroke well
 * for CRAV-style layered heroes. Variable weight (300–700) loads automatically,
 * so `font-semibold` / `font-bold` work on any heading.
 */
const fontDisplay = Fredoka({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: BRAND_FULL_NAME,
    template: `%s · ${BRAND_TITLE_LINE}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: BRAND_TITLE_LINE,
  keywords: [
    "The Bun Theory",
    "Bakar & Roast",
    "fire-roasted buns",
    "burgers",
    "Petaling Jaya",
    "food delivery",
    "pickup",
  ],
  icons: {
    icon: "/images/branding/bakar-roast-logo.png",
    apple: "/images/branding/bakar-roast-logo.png",
  },
  openGraph: {
    type: "website",
    siteName: BRAND_TITLE_LINE,
    title: BRAND_FULL_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: "en_MY",
    images: [
      {
        url: "/og.jpg",
        width: 1200,
        height: 630,
        alt: "The Bun Theory — fire-roasted buns, made to order.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND_FULL_NAME,
    description: SITE_DESCRIPTION,
    images: ["/og.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("light overflow-x-clip", fontSans.variable, fontDisplay.variable)}
    >
      <body className="min-h-screen w-full max-w-full overflow-x-clip bg-paper font-sans text-base leading-relaxed text-ink antialiased">
        <MotionProvider>
          <NavigationLoadingGate />
          {children}
          <CartSync />
        </MotionProvider>
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: "#fff7ed",
              border: "1px solid rgba(31, 41, 55, 0.1)",
              borderRadius: "12px",
            },
          }}
        />
      </body>
    </html>
  );
}
