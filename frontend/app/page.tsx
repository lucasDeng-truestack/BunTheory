import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  CustomerPageShell,
  MarketingHeader,
} from "@/components/layout/customer-shell";
import { Flame, MapPin, Truck } from "lucide-react";

export default function HomePage() {
  return (
    <CustomerPageShell>
      <MarketingHeader />

      <main className="pt-8 sm:pt-12">
        <div className="relative overflow-hidden rounded-3xl border border-charcoal/10 bg-white p-6 shadow-elevated sm:p-10">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-roast-red/10 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-mustard/20 blur-3xl"
            aria-hidden
          />

          <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-4 text-center lg:text-left">
              <p className="inline-flex items-center justify-center gap-2 rounded-full border border-charcoal/10 bg-cream/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-charcoal/70 lg:justify-start">
                <Flame className="h-3.5 w-3.5 text-roast-red" aria-hidden />
                Fire roasted · Artisan buns
              </p>
              <h2 className="text-balance text-3xl font-extrabold tracking-tight text-charcoal sm:text-4xl lg:text-5xl">
                Order in seconds.
                <span className="block text-roast-red">Picked up fresh.</span>
              </h2>
              <p className="mx-auto max-w-md text-pretty text-base text-charcoal/70 lg:mx-0 lg:text-lg">
                Browse the menu, build your cart, and checkout with just your name
                and phone. No account needed.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <Button size="lg" asChild className="w-full min-h-14 sm:w-auto sm:min-w-[220px]">
                  <Link href="/menu">
                    <Flame className="mr-2 h-5 w-5" />
                    View menu &amp; order
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="w-full min-h-14 sm:w-auto">
                  <Link href="/order">Go to checkout</Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 lg:gap-4">
              <div className="rounded-2xl border border-charcoal/10 bg-cream/40 p-4 shadow-card">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-roast-red shadow-sm">
                    <Truck className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <p className="font-semibold text-charcoal">Delivery</p>
                    <p className="text-sm text-charcoal/65">
                      Choose delivery at checkout when you place your order.
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-charcoal/10 bg-cream/40 p-4 shadow-card">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-roast-red shadow-sm">
                    <MapPin className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <p className="font-semibold text-charcoal">Pickup</p>
                    <p className="text-sm text-charcoal/65">
                      Prefer to swing by? Select pickup instead.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-charcoal/45">
          Questions about your order? You&apos;ll get updates on WhatsApp — we roast
          to order and pack it fresh.
        </p>
      </main>
    </CustomerPageShell>
  );
}
