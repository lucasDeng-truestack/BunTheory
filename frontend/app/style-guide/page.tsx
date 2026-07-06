import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sticker } from "@/components/brand/sticker";
import { SplashReplayButton } from "@/components/brand/splash-replay-button";
import { SiteNav } from "@/components/layout/site-nav";
import { WaveDivider } from "@/components/layout/wave-divider";
import { MarketingSection } from "@/components/layout/marketing-section";
import { CtaBand } from "@/components/layout/cta-band";

export const metadata: Metadata = {
  title: "Design System — The Bun Theory",
  robots: { index: false, follow: false },
};

const swatches: { name: string; token: string; className: string; text?: string }[] = [
  { name: "Bun Red", token: "bun-red", className: "bg-bun-red", text: "text-white" },
  { name: "Red Deep", token: "bun-red-deep", className: "bg-bun-red-deep", text: "text-white" },
  { name: "Bun Yellow", token: "bun-yellow", className: "bg-bun-yellow", text: "text-bun-ink" },
  { name: "Yellow Soft", token: "bun-yellow-soft", className: "bg-bun-yellow-soft", text: "text-bun-ink" },
  { name: "Cream", token: "bun-cream", className: "bg-bun-cream border border-bun-ink/10", text: "text-bun-ink" },
  { name: "Cream Soft", token: "bun-cream-soft", className: "bg-bun-cream-soft border border-bun-ink/10", text: "text-bun-ink" },
  { name: "Bun Black", token: "bun-black", className: "bg-bun-black", text: "text-bun-cream" },
  { name: "Ink", token: "bun-ink", className: "bg-bun-ink", text: "text-bun-cream" },
];

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto w-full max-w-[1100px] px-4 py-10 sm:px-6">
      <h3 className="mb-6 font-display text-sm font-semibold uppercase tracking-[0.2em] text-bun-red">
        {title}
      </h3>
      {children}
    </section>
  );
}

export default function StyleGuidePage() {
  return (
    <div className="min-h-screen bg-bun-cream">
      <SiteNav
        right={
          <span className="hidden rounded-full bg-bun-red px-3 py-1.5 font-display text-xs font-bold text-white sm:inline-flex">
            2 · RM24
          </span>
        }
      />

      {/* Hero: layered outlined headline + stickers */}
      <section className="relative overflow-hidden bg-hero-warm px-4 py-20 text-center sm:py-28">
        <div className="mx-auto max-w-4xl">
          <p className="mb-4 font-display text-sm font-semibold uppercase tracking-[0.25em] text-bun-red">
            Phase 1 · Shared Design System
          </p>
          <div className="relative inline-block">
            <h1 className="font-display text-6xl font-bold leading-[0.85] tracking-tight text-bun-ink sm:text-8xl">
              FIRE-ROASTED
              <br />
              <span className="text-bun-red text-shadow-pop">BUNS</span>
            </h1>
            <span
              className="pointer-events-none absolute -right-2 -top-6 select-none font-display text-6xl font-bold leading-[0.85] tracking-tight text-outline-red opacity-40 sm:-right-6 sm:-top-8 sm:text-8xl"
              aria-hidden
            >
              FIRE-ROASTED
            </span>
            <Sticker tone="yellow" rotate={-10} wobble className="absolute -left-6 top-2 sm:-left-14">
              New!
            </Sticker>
            <Sticker tone="red" rotate={8} className="absolute -bottom-4 right-0 sm:-right-10">
              RM from 8
            </Sticker>
          </div>
          <p className="mx-auto mt-8 max-w-xl text-base text-bun-ink-soft sm:text-lg">
            The loud, rounded, outlined display type + bold red / golden yellow / cream / warm-black
            palette. Fredoka for headlines, Inter for body &amp; data.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Button variant="hero" size="lg">Order Now</Button>
            <Button variant="yellow" size="lg">See the Menu</Button>
            <SplashReplayButton />
          </div>
        </div>
      </section>

      <Row title="Palette">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {swatches.map((s) => (
            <div key={s.token} className={`flex h-28 flex-col justify-end rounded-2xl p-4 shadow-soft ${s.className}`}>
              <span className={`font-display text-sm font-semibold ${s.text}`}>{s.name}</span>
              <span className={`font-mono text-xs opacity-80 ${s.text}`}>{s.token}</span>
            </div>
          ))}
        </div>
      </Row>

      <Row title="Type scale (Fredoka display / Inter body)">
        <div className="space-y-3">
          <p className="font-display text-6xl font-bold tracking-tight text-bun-ink">Display 6xl bold</p>
          <p className="font-display text-4xl font-semibold tracking-tight text-bun-ink">Heading 4xl semibold</p>
          <p className="font-display text-2xl font-medium text-bun-ink">Subhead 2xl medium</p>
          <p className="text-outline-ink font-display text-5xl font-bold tracking-tight">Outlined display</p>
          <p className="max-w-2xl text-base leading-relaxed text-bun-ink-soft">
            Body copy is Inter — neutral and legible for marketing paragraphs and dense admin tables
            alike. This keeps the loud personality in the headlines where it belongs.
          </p>
        </div>
      </Row>

      <Row title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="hero" size="lg">Hero pill</Button>
          <Button variant="yellow" size="lg">Yellow pill</Button>
          <Button variant="dark">Dark pill</Button>
          <Button>Default (admin/forms)</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="hero" size="xl">XL CTA</Button>
        </div>
      </Row>

      <Row title="Badges & stickers">
        <div className="flex flex-wrap items-center gap-4">
          <Badge>Default</Badge>
          <Badge variant="secondary">Popular</Badge>
          <Badge variant="yellow">Chef&apos;s pick</Badge>
          <Badge variant="dark">Sold out</Badge>
          <Badge variant="sticker">Fire-roasted</Badge>
          <span className="inline-flex items-center gap-4 pl-4">
            <Sticker tone="yellow" rotate={-6}>New</Sticker>
            <Sticker tone="red" rotate={6}>Hot</Sticker>
            <Sticker tone="black" rotate={-4}>RM12</Sticker>
          </span>
        </div>
      </Row>

      <Row title="Cards">
        <div className="grid gap-5 sm:grid-cols-3">
          {["Signature Bun", "Roasted Combo", "Sweet Finish"].map((t, i) => (
            <Card key={t} className="overflow-hidden">
              <div className="relative h-40 bg-checker">
                <Sticker tone={i === 1 ? "red" : "yellow"} rotate={-8} className="absolute right-3 top-3">
                  RM{8 + i * 2}
                </Sticker>
              </div>
              <CardHeader>
                <CardTitle className="font-display">{t}</CardTitle>
                <CardDescription>Fire-roasted, packed fresh to order.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="hero" size="sm" className="w-full">Add to cart</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </Row>

      {/* Alternating section rhythm + wave */}
      <MarketingSection
        tone="ink"
        eyebrow="Section rhythm"
        heading={<>Cream ↔ warm-black<br />alternating bands</>}
        intro="Marketing pages stack these full-bleed sections with wave seams between them — the CRAV scroll cadence."
      >
        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="yellow" size="lg">Primary on dark</Button>
          <Button variant="hero" size="lg">Red on dark</Button>
        </div>
      </MarketingSection>
      <WaveDivider fill="cream" />

      <MarketingSection tone="cream" eyebrow="Admin tokens" heading="Same brand, calmer for ops">
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { label: "Orders today", value: "38" },
            { label: "Revenue", value: "RM612" },
            { label: "Avg ticket", value: "RM16" },
            { label: "Active batch", value: "#7" },
          ].map((s) => (
            <div key={s.label} className="admin-stat-card text-left">
              <div className="admin-accent-bar mb-3" />
              <p className="admin-stat-value">{s.value}</p>
              <p className="admin-stat-label mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </MarketingSection>

      <CtaBand
        eyebrow="Repeated footer band"
        heading="Ready when the batch opens?"
        subheading="This CTA band is batch-aware in the real pages — closed state swaps the label + disables the pill."
        primary={{ href: "/menu", label: "Order Now" }}
        secondary={{ href: "/story", label: "Our Story" }}
      />
    </div>
  );
}
