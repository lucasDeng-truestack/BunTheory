import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { CartSync } from "@/components/providers/cart-sync";
import { cn } from "@/lib/utils";
import "./globals.css";

const fontSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bun Theory by Bakar & Roast",
  description: "Order delicious roasted buns - fast, simple, mobile-friendly",
  icons: {
    icon: "/images/branding/bakar-roast-logo.png",
    apple: "/images/branding/bakar-roast-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("light", fontSans.variable)}>
      <body className="min-h-screen bg-cream font-sans text-base leading-relaxed text-charcoal antialiased">
        {children}
        <CartSync />
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
