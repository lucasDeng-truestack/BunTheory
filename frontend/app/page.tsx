import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Flame, MapPin, ChefHat, ShoppingBag, Truck, Clock } from "lucide-react";
import { getMenu } from "@/services/menu.service";
import { getPublicSettings } from "@/services/storefront-settings.service";
import { formatRM } from "@/lib/money";
import {
  formatFromPrice,
  getLowestMenuPrice,
  getOutletLocationLabel,
  pickSpotlightItem,
  resolveItemImage,
  sortAvailableMenuItems,
  truncateStickerLabel,
} from "@/lib/storefront-display";
import type { MenuItem } from "@/types/menu";
import { Button } from "@/components/ui/button";
import { Sticker } from "@/components/brand/sticker";
import { JumpingText } from "@/components/brand/jumping-text";
import { PeelOnSticker } from "@/components/brand/peel-on-sticker";
import { BouncyIngredients } from "@/components/brand/bouncy-ingredients";
import { LoadingSplash } from "@/components/brand/loading-splash";
import { SiteNav } from "@/components/layout/site-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import { MarqueeStrip } from "@/components/layout/marquee-strip";
import { WaveDivider } from "@/components/layout/wave-divider";
import { CtaBand } from "@/components/layout/cta-band";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/reveal";
import {
  BatchStatusProvider,
  BatchStatusBand,
  BatchOrderButton,
} from "@/components/storefront/batch-status";
import { MobileOrderBar } from "@/components/storefront/mobile-order-bar";

// ISR: serve the marketing shell + menu preview from cache, revalidate every
// 60s. Live ordering availability is a client island (BatchStatusProvider), so
// the cached shell never shows stale open/closed state.
export const revalidate = 60;

const STEPS = [
  {
    icon: MapPin,
    title: "Pick your window",
    body: "Ordering runs in batch windows. Jump on when a batch is live — the status bar up top always tells you.",
  },
  {
    icon: ChefHat,
    title: "Build your order",
    body: "Choose your buns, load up the add-ons, and drop it all in your cart. No account, just a name and phone.",
  },
  {
    icon: ShoppingBag,
    title: "Fired & handed over",
    body: "Pay by QR or cash. We roast to order, pack it fresh, and ping you on WhatsApp when it's ready.",
  },
] as const;

/** Menu preview card — image, price, and copy all come from the live menu row. */
function PreviewCard({ item, index }: { item: MenuItem; index: number }) {
  const imageSrc = resolveItemImage(item);
  const hasOwnImage = Boolean(item.image?.trim());

  return (
    <Link
      href="/menu"
      className="group relative flex flex-col overflow-hidden rounded-4xl border-2 border-bun-ink bg-white shadow-sticker transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bun-red focus-visible:ring-offset-2"
    >
      <div className="relative aspect-[5/4] overflow-hidden bg-item-photo">
        <Image
          src={imageSrc}
          alt={item.name}
          fill
          className={hasOwnImage ? "object-cover" : "object-contain p-6"}
          sizes="(max-width: 640px) 100vw, 360px"
        />
        <Sticker
          tone={index % 2 === 0 ? "yellow" : "red"}
          rotate={index % 2 === 0 ? -8 : 7}
          className="absolute right-3 top-3 px-3 py-1.5"
        >
          {formatRM(item.price)}
        </Sticker>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-xl font-bold text-bun-ink">{item.name}</h3>
        {item.description && (
          <p className="mt-1.5 line-clamp-2 text-sm text-bun-ink-soft">{item.description}</p>
        )}
        <span className="mt-4 inline-flex items-center gap-1 font-display text-sm font-semibold text-bun-red-deep">
          Add to cart
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

export default async function HomePage() {
  let items: MenuItem[] = [];
  let settings = null;

  try {
    items = await getMenu(false, 60);
  } catch {
    // Menu unavailable — page still renders its static marketing sections.
  }

  try {
    settings = await getPublicSettings(60);
  } catch {
    // Settings optional for marketing shell.
  }

  const previewItems = sortAvailableMenuItems(items).slice(0, 6);
  const spotlightItem = pickSpotlightItem(items);
  const fromPriceLabel = formatFromPrice(getLowestMenuPrice(items));
  const locationLabel = getOutletLocationLabel(settings);
  const prepMinutes = settings?.prepTimeMinutes;
  const prepTimeLabel =
    prepMinutes != null && prepMinutes > 0 ? `Ready in ~${prepMinutes} min` : null;
  const heroBadge = locationLabel
    ? `Fire-roasted · ${locationLabel}`
    : "Fire-roasted";

  return (
    <BatchStatusProvider>
      <LoadingSplash />
      <div className="page-shell flex min-h-[100dvh] flex-col bg-bun-cream">
        <SiteNav />
        <BatchStatusBand />

        <main className="flex-1">
          {/* ─────────────────────────── HERO ─────────────────────────── */}
          <section className="relative overflow-hidden bg-hero-warm">
            <div className="mx-auto grid w-full max-w-[1200px] items-center gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6 lg:py-20">
              <Reveal className="text-center lg:text-left">
                <span className="inline-flex items-center gap-2 rounded-full border-2 border-bun-ink bg-white px-4 py-1.5 font-display text-xs font-semibold uppercase tracking-[0.15em] text-bun-ink shadow-sticker">
                  <Flame className="h-3.5 w-3.5 text-bun-red" />
                  {heroBadge}
                </span>

                <div className="relative mt-6 inline-block max-w-full overflow-hidden">
                  <h1 className="max-w-full font-display text-5xl font-bold leading-[0.85] tracking-tight text-bun-ink sm:text-7xl lg:text-8xl">
                    <span className="block">
                      <JumpingText
                        text="FIRE-ROASTED"
                        delay={0.2}
                        className="justify-center lg:justify-start"
                      />
                    </span>
                    <span className="block text-bun-red text-shadow-pop">
                      <JumpingText
                        text="BUNS"
                        delay={0.55}
                        className="justify-center lg:justify-start"
                      />
                    </span>
                  </h1>
                  <span
                    className="pointer-events-none absolute -right-1 -top-4 hidden select-none font-display text-5xl font-bold leading-[0.85] tracking-tight text-outline-red opacity-30 sm:block sm:text-7xl lg:text-8xl"
                    aria-hidden
                  >
                    FIRE-ROASTED
                  </span>
                </div>

                <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-bun-ink-soft lg:mx-0 lg:text-lg">
                  Slow-roasted fillings tucked into soft, hand-made buns — fired to order from our
                  home kitchen. Delivery or pickup, checkout with just your name and phone.
                </p>

                <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:items-start lg:justify-start">
                  <BatchOrderButton size="lg" className="w-full sm:w-auto" />
                  <Button asChild variant="yellow" size="lg" className="w-full sm:w-auto">
                    <Link href="/menu">See the menu</Link>
                  </Button>
                </div>

                <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-semibold text-bun-ink-soft lg:justify-start">
                  <span className="inline-flex items-center gap-1.5">
                    <Flame className="h-4 w-4 text-bun-red" /> Roasted to order
                  </span>
                  {prepTimeLabel ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-bun-red" /> {prepTimeLabel}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1.5">
                    <ShoppingBag className="h-4 w-4 text-bun-red" /> No account needed
                  </span>
                </div>
              </Reveal>

              {/* Hero food — spotlight item + stickers derived from live menu/settings */}
              {spotlightItem ? (
                <Reveal hero className="relative mx-auto w-full max-w-md lg:max-w-none">
                  <div className="relative aspect-square rotate-2 overflow-hidden rounded-5xl border-2 border-bun-ink bg-item-photo shadow-sticker-lg">
                    <Image
                      src={resolveItemImage(spotlightItem)}
                      alt={spotlightItem.name}
                      fill
                      priority
                      className={
                        spotlightItem.image?.trim()
                          ? "object-cover"
                          : "object-contain p-8"
                      }
                      sizes="(max-width: 1024px) 90vw, 520px"
                    />
                  </div>
                  <PeelOnSticker
                    tone="yellow"
                    rotate={-12}
                    trigger="mount"
                    delay={0.9}
                    className="absolute -left-3 top-6 sm:-left-6"
                  >
                    {spotlightItem.isFavorite
                      ? "Staff pick"
                      : truncateStickerLabel(spotlightItem.name)}
                  </PeelOnSticker>
                  {fromPriceLabel ? (
                    <PeelOnSticker
                      tone="red"
                      rotate={9}
                      trigger="mount"
                      delay={1.05}
                      className="absolute -bottom-3 right-4 sm:-right-4"
                    >
                      {fromPriceLabel}
                    </PeelOnSticker>
                  ) : null}
                  <PeelOnSticker
                    tone="black"
                    rotate={-5}
                    trigger="mount"
                    delay={1.2}
                    className="absolute -top-4 right-8"
                  >
                    Fire-roasted
                  </PeelOnSticker>
                </Reveal>
              ) : null}
            </div>
          </section>

          <MarqueeStrip tone="red" />

          {/* ───────────────────── HOW IT WORKS ───────────────────── */}
          <section className="bg-cream-section px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
            <div className="mx-auto w-full max-w-[1200px]">
              <Reveal className="mb-12 text-center">
                <p className="mb-3 font-display text-sm font-semibold uppercase tracking-[0.2em] text-bun-red-deep">
                  How it works
                </p>
                <h2 className="font-display text-4xl font-bold leading-[0.95] tracking-tight text-bun-ink sm:text-5xl lg:text-6xl">
                  From craving to counter
                </h2>
              </Reveal>
              <RevealGroup className="grid gap-5 sm:grid-cols-3">
                {STEPS.map((step, i) => (
                  <RevealItem
                    key={step.title}
                    className="relative overflow-hidden rounded-4xl border-2 border-bun-ink bg-white p-7 shadow-sticker"
                  >
                    <span
                      className="absolute right-5 top-3 font-display text-6xl font-bold text-bun-yellow"
                      aria-hidden
                    >
                      {i + 1}
                    </span>
                    <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-bun-ink bg-bun-yellow text-bun-ink">
                      <step.icon className="h-6 w-6" />
                    </span>
                    <h3 className="relative mt-5 font-display text-2xl font-bold text-bun-ink">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-bun-ink-soft">{step.body}</p>
                  </RevealItem>
                ))}
              </RevealGroup>
            </div>
          </section>

          {/* ───────────────────── MENU PREVIEW ───────────────────── */}
          {previewItems.length > 0 && (
            <section className="bg-checker px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
              <div className="mx-auto w-full max-w-[1200px]">
                <Reveal className="mb-12 flex flex-col items-center gap-5 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left">
                  <div>
                    <p className="mb-3 font-display text-sm font-semibold uppercase tracking-[0.2em] text-bun-red-deep">
                      Straight from the grill
                    </p>
                    <h2 className="font-display text-4xl font-bold leading-[0.95] tracking-tight text-bun-ink sm:text-5xl lg:text-6xl">
                      The lineup
                    </h2>
                  </div>
                  <Button asChild variant="dark" size="lg" className="shrink-0">
                    <Link href="/menu">
                      Full menu
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                </Reveal>
                <RevealGroup className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {previewItems.map((item, i) => (
                    <RevealItem key={item.id} className="flex">
                      <div className="flex-1">
                        <PreviewCard item={item} index={i} />
                      </div>
                    </RevealItem>
                  ))}
                </RevealGroup>
              </div>
            </section>
          )}

          <WaveDivider fill="black" className="bg-bun-cream" />

          {/* ───────────────────── STORY TEASER (dark) ───────────────────── */}
          <section className="bg-ink-section px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
            <div className="mx-auto grid w-full max-w-[1200px] items-center gap-10 lg:grid-cols-2">
              <Reveal variant="scale" className="relative order-2 lg:order-1">
                <div className="relative aspect-[4/3] -rotate-2 overflow-hidden rounded-5xl border-2 border-bun-cream/20 bg-bun-black/40">
                  <Image
                    src="/images/items/paper-bag.webp"
                    alt="Packed fresh"
                    fill
                    className="object-contain p-10"
                    sizes="(max-width: 1024px) 90vw, 520px"
                  />
                </div>
                <PeelOnSticker tone="yellow" rotate={-10} className="absolute -right-2 -top-4">
                  Home kitchen
                </PeelOnSticker>
              </Reveal>
              <Reveal variant="right" className="order-1 text-center lg:order-2 lg:text-left">
                <p className="mb-3 font-display text-sm font-semibold uppercase tracking-[0.2em] text-bun-yellow">
                  Our story
                </p>
                <h2 className="font-display text-4xl font-bold leading-[0.95] tracking-tight text-bun-cream sm:text-5xl lg:text-6xl">
                  Roasted with fire,
                  <br />
                  <span className="text-bun-yellow">packed with love</span>
                </h2>
                <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-bun-cream/80 lg:mx-0 lg:text-lg">
                  Bakar &amp; Roast started as two friends chasing the perfect fire-roasted bun. Every
                  batch is fired to order from a home kitchen in Petaling Jaya — small runs, big
                  flavour.
                </p>
                <Button asChild variant="yellow" size="lg" className="mt-8">
                  <Link href="/story">
                    Read our story
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </Reveal>
            </div>
          </section>

          <WaveDivider fill="cream" className="bg-bun-black" />

          {/* ───────────────────── DELIVERY / PICKUP ───────────────────── */}
          <section className="bg-cream-section px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
            <div className="mx-auto w-full max-w-[1200px]">
              <Reveal className="mb-12 text-center">
                <p className="mb-3 font-display text-sm font-semibold uppercase tracking-[0.2em] text-bun-red-deep">
                  Two ways to get it
                </p>
                <h2 className="font-display text-4xl font-bold leading-[0.95] tracking-tight text-bun-ink sm:text-5xl lg:text-6xl">
                  Delivery or pickup
                </h2>
              </Reveal>
              <RevealGroup className="grid gap-6 sm:grid-cols-2">
                {[
                  {
                    icon: Truck,
                    title: "Delivery",
                    body: "Choose delivery, drop your address, and we'll bring the batch to your door once it's fired.",
                  },
                  {
                    icon: MapPin,
                    title: "Pickup",
                    body: "Prefer to swing by? Pick pickup and collect fresh off the grill at the outlet.",
                  },
                ].map((c) => (
                  <RevealItem
                    key={c.title}
                    className="flex items-start gap-5 rounded-4xl border-2 border-bun-ink bg-white p-7 shadow-sticker"
                  >
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-bun-ink bg-bun-red text-white">
                      <c.icon className="h-6 w-6" />
                    </span>
                    <div>
                      <h3 className="font-display text-2xl font-bold text-bun-ink">{c.title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-bun-ink-soft">{c.body}</p>
                    </div>
                  </RevealItem>
                ))}
              </RevealGroup>
            </div>
          </section>

          {/* ───────────────────── FRESH INGREDIENTS (scattered cut-outs, bounce on scroll) ───────────────────── */}
          <section className="relative min-h-[26rem] overflow-hidden bg-bun-cream-soft px-4 py-24 text-center sm:min-h-[34rem] sm:px-6 sm:py-32">
            <BouncyIngredients className="absolute inset-0" />
            <div className="relative mx-auto flex min-h-[inherit] max-w-2xl flex-col items-center justify-center">
              <p className="mb-2 font-display text-sm font-semibold uppercase tracking-[0.2em] text-bun-red-deep">
                Fresh every batch
              </p>
              <h2 className="font-display text-3xl font-bold tracking-tight text-bun-ink sm:text-5xl">
                Stacked with the good stuff
              </h2>
              <p className="mt-4 max-w-md text-base leading-relaxed text-bun-ink/70">
                Prepped the morning of, roasted to order — nothing sits, nothing wilts.
              </p>
            </div>
          </section>

          {/* ───────────────────── CLOSING CTA (batch-aware) ───────────────────── */}
          <CtaBand
            eyebrow="The Bun Theory"
            heading={
              <>
                Hungry? Let&apos;s get <span className="text-bun-yellow">roasting.</span>
              </>
            }
            subheading="When a batch is live, your next bun is a few taps away. No app, no account — just good food, fast."
            action={<BatchOrderButton size="lg" />}
            secondary={{ href: "/menu", label: "Browse the menu" }}
          />
        </main>

        <SiteFooter />
        {/* Spacer so the fixed mobile order bar never covers the footer. */}
        <div aria-hidden className="h-20 lg:hidden" />
      </div>
      <MobileOrderBar />
    </BatchStatusProvider>
  );
}
