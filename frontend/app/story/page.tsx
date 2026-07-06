import type { Metadata } from "next";
import Image from "next/image";
import { Flame, Leaf, HandHeart, Clock, Sparkles } from "lucide-react";
import { Sticker } from "@/components/brand/sticker";
import { JumpingText } from "@/components/brand/jumping-text";
import { PeelOnSticker } from "@/components/brand/peel-on-sticker";
import { BouncyIngredients } from "@/components/brand/bouncy-ingredients";
import { SiteNav } from "@/components/layout/site-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import { MarqueeStrip } from "@/components/layout/marquee-strip";
import { WaveDivider } from "@/components/layout/wave-divider";
import { MarketingSection } from "@/components/layout/marketing-section";
import { CtaBand } from "@/components/layout/cta-band";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/reveal";
import {
  BatchStatusProvider,
  BatchStatusBand,
  BatchOrderButton,
} from "@/components/storefront/batch-status";
import { BRAND_TITLE_LINE } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Our Story — ${BRAND_TITLE_LINE}`,
  description:
    "How Bakar & Roast turned a home kitchen and an open flame into fire-roasted buns made to order in Petaling Jaya.",
};

/** CRAV /spices-style ingredient card — placeholder-friendly image slot + sticker label. */
function IngredientCard({
  index,
  emoji,
  title,
  body,
  image,
}: {
  index: number;
  emoji: string;
  title: string;
  body: string;
  image?: string;
}) {
  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-4xl border-2 border-bun-ink bg-white shadow-sticker transition-transform duration-200 hover:-translate-y-1">
      <div className="relative flex aspect-[5/4] items-center justify-center overflow-hidden bg-checker">
        {image ? (
          <Image
            src={image}
            alt={title}
            fill
            className="object-contain p-6 transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, 360px"
          />
        ) : (
          <span className="text-6xl" aria-hidden>
            {emoji}
          </span>
        )}
        <Sticker
          tone={index % 2 === 0 ? "yellow" : "red"}
          rotate={index % 2 === 0 ? -8 : 7}
          className="absolute left-3 top-3 px-3 py-1.5"
        >
          {`0${index + 1}`}
        </Sticker>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-display text-2xl font-bold text-bun-ink">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-bun-ink-soft">{body}</p>
      </div>
    </div>
  );
}

const INGREDIENTS = [
  {
    emoji: "🥖",
    title: "The bun",
    body: "Soft, hand-shaped and lightly toasted so it holds up to everything we pack inside. The vessel matters as much as the filling.",
    image: "/images/items/Burger.webp",
  },
  {
    emoji: "🔥",
    title: "The roast",
    body: "Fillings kissed by an open flame — that char, that smoke. Fired to order, never sitting under a heat lamp.",
  },
  {
    emoji: "🌶️",
    title: "The rub",
    body: "Our house spice blend, layered on before the flame ever touches it. Warm, a little smoky, unmistakably ours.",
  },
  {
    emoji: "🥣",
    title: "The sauce",
    body: "Made in small batches by hand. The finishing touch that ties the smoke, the spice and the softness together.",
  },
] as const;

const VALUES = [
  {
    icon: Flame,
    title: "Fired to order",
    body: "Nothing pre-made. Your batch is roasted when you order it, so it lands hot and fresh.",
  },
  {
    icon: HandHeart,
    title: "Home-kitchen small",
    body: "We keep batches small on purpose. Fewer buns, more care — the way we'd cook for family.",
  },
  {
    icon: Leaf,
    title: "Sourced local",
    body: "Ingredients from close to home in Petaling Jaya, picked fresh for each order window.",
  },
] as const;

export default function StoryPage() {
  return (
    <BatchStatusProvider>
      <div className="flex min-h-[100dvh] flex-col bg-bun-cream">
        <SiteNav />
        <BatchStatusBand />

        <main className="flex-1">
          {/* ─────────────────────────── HERO ─────────────────────────── */}
          <section className="relative overflow-hidden bg-ink-section px-4 py-16 text-center sm:px-6 sm:py-24">
            <div className="mx-auto max-w-3xl">
              <p className="mb-3 font-display text-sm font-semibold uppercase tracking-[0.25em] text-bun-yellow">
                Bakar &amp; Roast
              </p>
              <div className="relative inline-block">
                <h1 className="font-display text-6xl font-bold leading-[0.85] tracking-tight text-bun-cream sm:text-8xl">
                  <span className="block">
                    <JumpingText text="OUR" delay={0.15} className="justify-center" />
                  </span>
                  <span className="block text-bun-yellow text-shadow-pop">
                    <JumpingText text="STORY" delay={0.4} className="justify-center" />
                  </span>
                </h1>
                <span
                  className="pointer-events-none absolute -right-2 -top-4 hidden select-none font-display text-6xl font-bold leading-[0.85] tracking-tight text-outline-cream opacity-20 sm:block sm:text-8xl"
                  aria-hidden
                >
                  OUR
                </span>
                <PeelOnSticker
                  tone="red"
                  rotate={-10}
                  trigger="mount"
                  delay={0.85}
                  className="absolute -left-6 top-2 sm:-left-16"
                >
                  Est. PJ
                </PeelOnSticker>
              </div>
              <p className="mx-auto mt-7 max-w-xl text-base leading-relaxed text-bun-cream/80 sm:text-lg">
                Two friends, one open flame, and a stubborn belief that a bun can be the best thing
                you eat all week. This is how The Bun Theory got fired up.
              </p>
            </div>
          </section>

          <MarqueeStrip tone="yellow" items={["Bakar = to roast", "Fire-roasted", "Made to order", "Small batches", "Petaling Jaya"]} />

          {/* ───────────────────── HOW IT BEGAN (cream) ───────────────────── */}
          <section className="bg-cream-section px-4 py-16 sm:px-6 sm:py-24">
            <div className="mx-auto grid w-full max-w-[1200px] items-center gap-10 lg:grid-cols-2">
              <Reveal variant="scale" className="relative order-2 lg:order-1">
                <div className="relative aspect-[4/3] rotate-2 overflow-hidden rounded-5xl border-2 border-bun-ink bg-checker shadow-sticker-lg">
                  <Image
                    src="/images/items/Burger.webp"
                    alt="A fire-roasted bun"
                    fill
                    className="object-contain p-10"
                    sizes="(max-width: 1024px) 90vw, 560px"
                  />
                </div>
                <PeelOnSticker tone="yellow" rotate={-9} className="absolute -right-3 -top-4">
                  Batch #1
                </PeelOnSticker>
              </Reveal>
              <Reveal variant="right" className="order-1 text-center lg:order-2 lg:text-left">
                <p className="mb-3 font-display text-sm font-semibold uppercase tracking-[0.2em] text-bun-red-deep">
                  How it began
                </p>
                <h2 className="font-display text-4xl font-bold leading-[0.95] tracking-tight text-bun-ink sm:text-5xl">
                  It started with a flame
                  <br />
                  <span className="text-bun-red">and a craving</span>
                </h2>
                <div className="mx-auto mt-5 max-w-lg space-y-4 text-base leading-relaxed text-bun-ink-soft lg:mx-0">
                  <p>
                    We never set out to open a shop. It began at home — a grill, a bag of buns, and
                    friends who kept asking for &ldquo;that roasted thing you make.&rdquo;
                  </p>
                  <p>
                    So we leaned in. We refined the roast, dialled in the spice, and started taking a
                    handful of orders at a time. The Bun Theory is that same home kitchen — just a
                    little more organised.
                  </p>
                </div>
              </Reveal>
            </div>
          </section>

          <WaveDivider fill="black" className="bg-bun-cream" />

          {/* ───────────────────── THE FIRE-ROAST (dark) ───────────────────── */}
          <section className="bg-ink-section px-4 py-16 sm:px-6 sm:py-24">
            <div className="mx-auto grid w-full max-w-[1200px] items-center gap-10 lg:grid-cols-2">
              <Reveal variant="left" className="text-center lg:text-left">
                <p className="mb-3 font-display text-sm font-semibold uppercase tracking-[0.2em] text-bun-yellow">
                  Why &ldquo;Bakar&rdquo;
                </p>
                <h2 className="font-display text-4xl font-bold leading-[0.95] tracking-tight text-bun-cream sm:text-5xl">
                  Bakar means
                  <br />
                  <span className="text-bun-yellow">to roast</span>
                </h2>
                <div className="mx-auto mt-5 max-w-lg space-y-4 text-base leading-relaxed text-bun-cream/80 lg:mx-0">
                  <p>
                    In Malay, <em>bakar</em> is to roast over fire. Pair it with an English roast and
                    you get our whole philosophy in one name: flame first, always.
                  </p>
                  <p>
                    Every filling meets real heat before it meets your bun. That&apos;s where the char
                    comes from, the smoke, the smell that makes people wander over. No shortcuts, no
                    heat lamps.
                  </p>
                </div>
              </Reveal>
              <Reveal variant="scale" className="relative">
                <div className="relative aspect-[4/3] -rotate-2 overflow-hidden rounded-5xl border-2 border-bun-cream/20 bg-bun-black/40 shadow-sticker-lg">
                  <Image
                    src="/images/items/paper-bag.webp"
                    alt="Packed fresh, fired to order"
                    fill
                    className="object-contain p-10"
                    sizes="(max-width: 1024px) 90vw, 560px"
                  />
                </div>
                <PeelOnSticker tone="yellow" rotate={8} className="absolute -left-3 -bottom-4">
                  Flame first
                </PeelOnSticker>
              </Reveal>
            </div>
          </section>

          <WaveDivider fill="cream" className="bg-bun-black" />

          {/* ───────────────────── WHAT GOES IN (ingredients grid) ───────────────────── */}
          <MarketingSection
            tone="cream"
            eyebrow="What goes in"
            heading={<>Four things, done right</>}
            intro="No mystery, no filler. Just the handful of things that make a Bun Theory bun taste like a Bun Theory bun."
          >
            <RevealGroup className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {INGREDIENTS.map((ing, i) => (
                <RevealItem key={ing.title} className="flex">
                  <div className="flex-1">
                    <IngredientCard
                      index={i}
                      emoji={ing.emoji}
                      title={ing.title}
                      body={ing.body}
                      image={"image" in ing ? (ing.image as string) : undefined}
                    />
                  </div>
                </RevealItem>
              ))}
            </RevealGroup>
            <BouncyIngredients className="mt-14" />
          </MarketingSection>

          {/* ───────────────────── OUR PROMISE (values) ───────────────────── */}
          <MarketingSection
            tone="cream-soft"
            eyebrow="Our promise"
            heading={<>Small batches, big care</>}
          >
            <RevealGroup className="grid gap-6 sm:grid-cols-3">
              {VALUES.map((v) => (
                <RevealItem
                  key={v.title}
                  className="rounded-4xl border-2 border-bun-ink bg-white p-7 text-center shadow-sticker"
                >
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-bun-ink bg-bun-yellow text-bun-ink">
                    <v.icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-5 font-display text-2xl font-bold text-bun-ink">{v.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-bun-ink-soft">{v.body}</p>
                </RevealItem>
              ))}
            </RevealGroup>

            <Reveal className="mx-auto mt-12 flex max-w-xl flex-col items-center gap-4 rounded-4xl border-2 border-bun-ink bg-bun-yellow p-8 text-center shadow-sticker">
              <span className="inline-flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-[0.15em] text-bun-ink">
                <Sparkles className="h-4 w-4" /> The Bun Theory
              </span>
              <p className="font-display text-2xl font-bold leading-tight text-bun-ink sm:text-3xl">
                &ldquo;Roast it like you&apos;re cooking for someone you love.&rdquo;
              </p>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-bun-ink/70">
                <Clock className="h-4 w-4" /> Since day one
              </span>
            </Reveal>
          </MarketingSection>

          <WaveDivider fill="black" className="bg-bun-cream-soft" />

          {/* ───────────────────── CLOSING CTA (batch-aware) ───────────────────── */}
          <CtaBand
            eyebrow="Hungry yet?"
            heading={
              <>
                Come taste the <span className="text-bun-yellow">theory.</span>
              </>
            }
            subheading="When a batch is live, you're a few taps from a fire-roasted bun of your own."
            action={<BatchOrderButton size="lg" />}
            secondary={{ href: "/menu", label: "See the menu" }}
          />
        </main>

        <SiteFooter />
      </div>
    </BatchStatusProvider>
  );
}
