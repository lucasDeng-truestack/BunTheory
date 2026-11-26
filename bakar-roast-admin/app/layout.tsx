import type { Metadata } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import "./globals.css";
import { SmoothScroll } from "@/components/smooth-scroll";
import { ThemeScript } from "@/components/theme";

// Display face. The wdth axis is required for the condensed width 80 cut; opsz keeps big
// headlines on the display optical size. Kept in parity with the public site so the admin
// shares the same type and theme tokens.
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  axes: ["opsz", "wdth"],
  variable: "--font-display",
  display: "swap",
});

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Admin | Bakar & Roast",
  description: "Owner admin for Bakar & Roast and The Bun Theory.",
  robots: { index: false, follow: false },
};

// Admin-only root layout. No marketing chrome (Header/Footer/Preloader/Cursor/GrainOverlay) —
// the admin frame is AdminShell, mounted by app/admin/layout.tsx. SmoothScroll stays so the
// Lenis provider that admin-shell's useLenis() reads is present.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the theme inline script sets data-theme on <html> before hydration.
    <html lang="en" className={`${bricolage.variable} ${figtree.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-ink font-sans text-cream antialiased">
        <ThemeScript />
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
