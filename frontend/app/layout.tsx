import type { Metadata } from "next";
import { Toaster } from "sonner";
import { CartSync } from "@/components/providers/cart-sync";
import "./globals.css";

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
    <html lang="en" className="light">
      <body className="min-h-screen antialiased bg-cream text-charcoal">
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
