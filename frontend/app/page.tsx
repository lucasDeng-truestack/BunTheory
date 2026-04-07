import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  CustomerPageShell,
  customerMainPaddingClass,
  MarketingHeader,
} from "@/components/layout/customer-shell";
import { cn } from "@/lib/utils";
import { Flame, MapPin, Truck } from "lucide-react";
import { getMenu } from "@/services/menu.service";
import { MenuHighlights } from "@/components/menu/menu-highlights";
import { HeroImageStack } from "@/components/menu/hero-image-stack";
import { FadeIn } from "@/components/ui/fade-in";
import SiteFooter from "@/components/ui/footer";
import type { MenuItem } from "@/types/menu";

export default async function HomePage() {
  let items: MenuItem[] = [];
  try {
    items = await getMenu();
  } catch {
    // Menu unavailable — page renders without dynamic sections
  }

  const favoriteItems = items.filter(
    (item) => item.available && !item.soldOut && item.image && item.isFavorite
  );

  return (
    <CustomerPageShell>
      <MarketingHeader />

      <main
        className={cn(
          "flex flex-1 flex-col pb-12 pt-8 sm:pt-12 lg:pt-14",
          customerMainPaddingClass
        )}
      >
        {/* ─── HERO ─── */}
        <div className="relative overflow-hidden rounded-3xl bg-hero-warm shadow-hero">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-roast-red/10 blur-2xl sm:blur-3xl lg:h-80 lg:w-80"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-mustard/20 blur-2xl sm:blur-3xl lg:h-64 lg:w-64"
            aria-hidden
          />

          <div className="relative grid lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-6 p-6 text-center sm:p-10 lg:flex lg:flex-col lg:justify-center lg:p-12 lg:text-left xl:p-16">
              <p className="inline-flex items-center justify-center gap-2 rounded-full border border-deep-red/15 bg-white/70 px-4 py-1.5 text-sm font-bold uppercase tracking-wide text-deep-red backdrop-blur-sm lg:justify-start">
                <Flame className="h-4 w-4" aria-hidden />
                Fire roasted · Artisan buns
              </p>

              <h2 className="text-balance text-4xl font-black tracking-tight text-charcoal sm:text-5xl lg:text-6xl lg:leading-[1.05]">
                Order in seconds.
                <span className="block text-roast-red">Picked up fresh.</span>
              </h2>

              <p className="mx-auto max-w-xl text-pretty text-base text-charcoal/70 lg:mx-0 lg:text-lg xl:text-xl">
                Browse the menu, build your cart, and checkout with just your
                name and phone. No account needed.
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

            <div className="relative mx-6 mb-6 flex min-h-[340px] items-end justify-center sm:min-h-[380px] lg:mx-0 lg:mb-0 lg:min-h-[520px] lg:items-center lg:justify-center lg:pl-0 lg:pr-0 xl:-translate-x-2">
              <div className="relative h-[min(64vw,360px)] w-full max-w-xl sm:min-h-[26rem] sm:h-[26rem] lg:h-[min(540px,52vw)] lg:max-w-[min(100%,640px)] lg:flex-1">
                <div
                  className="pointer-events-none absolute inset-[4%] -z-10 rounded-[2.5rem] bg-[radial-gradient(ellipse_85%_75%_at_70%_55%,rgba(255,210,170,0.35),rgba(255,237,213,0.12)_45%,transparent_72%)]"
                  aria-hidden
                />
                <HeroImageStack />
              </div>
            </div>
          </div>
        </div>

        {/* ─── Delivery / Pickup ─── */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:mt-8">
          <div className="rounded-2xl border border-charcoal/10 bg-white p-5 shadow-card transition-all duration-300 [@media(hover:hover)_and_(pointer:fine)]:hover:-translate-y-0.5 [@media(hover:hover)_and_(pointer:fine)]:hover:shadow-card-hover lg:p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-roast-red/10 text-roast-red">
                <Truck className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="font-bold text-charcoal">Delivery</p>
                <p className="mt-1 text-sm leading-relaxed text-charcoal/60">
                  Choose delivery at checkout when you place your order.
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-charcoal/10 bg-white p-5 shadow-card transition-all duration-300 [@media(hover:hover)_and_(pointer:fine)]:hover:-translate-y-0.5 [@media(hover:hover)_and_(pointer:fine)]:hover:shadow-card-hover lg:p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-roast-red/10 text-roast-red">
                <MapPin className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="font-bold text-charcoal">Pickup</p>
                <p className="mt-1 text-sm leading-relaxed text-charcoal/60">
                  Prefer to swing by? Select pickup instead.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── MENU HIGHLIGHTS ─── */}
        {favoriteItems.length > 0 && (
          <FadeIn className="mt-12 lg:mt-16">
            <MenuHighlights
              items={favoriteItems}
              linkItemsToMenu={false}
              title="Crowd Favorites"
              eyebrow="Our Menu"
              description="A preview of fan favourites — use “View menu & order” above to build your cart in one place."
            />
          </FadeIn>
        )}

        <SiteFooter />
      </main>
    </CustomerPageShell>
  );
}
