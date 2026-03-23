import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  CustomerPageShell,
  customerMainPaddingClass,
  MarketingHeader,
} from "@/components/layout/customer-shell";
import { cn } from "@/lib/utils";
import { Flame, MapPin, MessageCircle, Sparkles, Truck, Utensils } from "lucide-react";

export default function HomePage() {
  return (
    <CustomerPageShell>
      <MarketingHeader />

      <main
        className={cn(
          "flex flex-1 flex-col pb-12 pt-8 sm:pt-12 lg:pt-14",
          customerMainPaddingClass
        )}
      >
        <div className="relative overflow-hidden rounded-3xl border border-charcoal/10 bg-white p-6 shadow-elevated sm:p-10 lg:p-12">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-roast-red/10 blur-3xl lg:h-72 lg:w-72"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-mustard/20 blur-3xl lg:h-64 lg:w-64"
            aria-hidden
          />

          <div className="relative grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-12 xl:gap-16">
            <div className="space-y-5 text-center lg:space-y-6 lg:text-left">
              <p className="inline-flex items-center justify-center gap-2 rounded-full border border-charcoal/10 bg-cream/60 px-3 py-1.5 text-sm font-semibold uppercase tracking-wide text-charcoal/70 lg:justify-start">
                <Flame className="h-3.5 w-3.5 text-roast-red" aria-hidden />
                Fire roasted · Artisan buns
              </p>
              <h2 className="text-balance text-3xl font-extrabold tracking-tight text-charcoal sm:text-4xl lg:text-5xl xl:text-[3.25rem] lg:leading-[1.1]">
                Order in seconds.
                <span className="block text-roast-red">Picked up fresh.</span>
              </h2>
              <p className="mx-auto max-w-xl text-pretty text-base text-charcoal/70 lg:mx-0 lg:text-lg xl:text-xl">
                Browse the menu, build your cart, and checkout with just your name
                and phone. No account needed.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <Button
                  size="lg"
                  asChild
                  className="w-full min-h-14 sm:w-auto sm:min-w-[220px]"
                >
                  <Link href="/menu">
                    <Flame className="mr-2 h-5 w-5" />
                    View menu &amp; order
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="w-full min-h-14 sm:w-auto"
                >
                  <Link href="/order">Go to checkout</Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 lg:gap-4">
              <div className="rounded-2xl border border-charcoal/10 bg-cream/40 p-5 shadow-card transition-shadow hover:shadow-elevated lg:p-6">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-roast-red shadow-sm">
                    <Truck className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <p className="font-semibold text-charcoal">Delivery</p>
                    <p className="mt-1 text-sm leading-relaxed text-charcoal/65">
                      Choose delivery at checkout when you place your order.
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-charcoal/10 bg-cream/40 p-5 shadow-card transition-shadow hover:shadow-elevated lg:p-6">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-roast-red shadow-sm">
                    <MapPin className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <p className="font-semibold text-charcoal">Pickup</p>
                    <p className="mt-1 text-sm leading-relaxed text-charcoal/65">
                      Prefer to swing by? Select pickup instead.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section
          className="mt-12 rounded-3xl border border-charcoal/10 bg-white/80 p-6 shadow-card sm:p-8 lg:mt-16 lg:p-10"
          aria-labelledby="why-heading"
        >
          <div className="mb-8 text-center lg:mb-10">
            <p className="text-section-label">Why order here</p>
            <h2
              id="why-heading"
              className="mt-2 text-2xl font-bold tracking-tight text-charcoal sm:text-3xl"
            >
              Built for a quick bite, not a long signup
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-pretty text-charcoal/65 lg:text-lg">
              Same brand colors and calm layout on every screen — wider on tablet
              and desktop so nothing feels cramped.
            </p>
          </div>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            <li className="flex gap-4 rounded-2xl border border-charcoal/5 bg-cream/30 p-5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-roast-red/10 text-roast-red">
                <Sparkles className="h-6 w-6" aria-hidden />
              </span>
              <div>
                <p className="font-semibold text-charcoal">Minimal checkout</p>
                <p className="mt-1 text-sm leading-relaxed text-charcoal/65">
                  Name, phone, pickup or delivery — that&apos;s it.
                </p>
              </div>
            </li>
            <li className="flex gap-4 rounded-2xl border border-charcoal/5 bg-cream/30 p-5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-roast-red/10 text-roast-red">
                <MessageCircle className="h-6 w-6" aria-hidden />
              </span>
              <div>
                <p className="font-semibold text-charcoal">WhatsApp updates</p>
                <p className="mt-1 text-sm leading-relaxed text-charcoal/65">
                  Hear when your order is received, prepping, and ready.
                </p>
              </div>
            </li>
            <li className="flex gap-4 rounded-2xl border border-charcoal/5 bg-cream/30 p-5 sm:col-span-2 lg:col-span-1">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-roast-red/10 text-roast-red">
                <Utensils className="h-6 w-6" aria-hidden />
              </span>
              <div>
                <p className="font-semibold text-charcoal">Roasted to order</p>
                <p className="mt-1 text-sm leading-relaxed text-charcoal/65">
                  Kitchen load is shown on the menu so you know what to expect.
                </p>
              </div>
            </li>
          </ul>
        </section>

        <p className="text-fine-print mt-10 text-center lg:mt-12">
          Questions about your order? You&apos;ll get updates on WhatsApp — we roast
          to order and pack it fresh.{" "}
          <Link
            href="/track"
            className="font-medium text-roast-red underline underline-offset-2 hover:opacity-90"
          >
            Track an active order
          </Link>
          .
        </p>
      </main>
    </CustomerPageShell>
  );
}
