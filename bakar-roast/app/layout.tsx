import type { Metadata } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import "./globals.css";
import { SmoothScroll } from "@/components/smooth-scroll";
import { Header } from "@/components/ui/header";
import { Footer } from "@/components/ui/footer";
import { GrainOverlay } from "@/components/grain-overlay";
import { Preloader } from "@/components/preloader";
import { Cursor } from "@/components/cursor";

// Display face. The wdth axis is required for the condensed width 80 cut; opsz keeps big
// headlines on the display optical size.
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
  title: "Bakar & Roast | Fire. Feast. Family.",
  description:
    "Wood-fired catering from Petaling Jaya, Kuala Lumpur. From one Christmas table to yours. Home of The Bun Theory and The Weekend Grill.",
  openGraph: {
    title: "Bakar & Roast | Fire. Feast. Family.",
    description:
      "Wood-fired catering for the gatherings that matter. Petaling Jaya, Kuala Lumpur.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // suppressHydrationWarning: the preloader's inline script may set data-preload before hydration.
    <html lang="en" className={`${bricolage.variable} ${figtree.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-ink font-sans text-cream antialiased">
        <Preloader />
        <SmoothScroll>
          <GrainOverlay />
          <Header />
          <main>{children}</main>
          <Footer />
          <Cursor />
        </SmoothScroll>
      </body>
    </html>
  );
}
