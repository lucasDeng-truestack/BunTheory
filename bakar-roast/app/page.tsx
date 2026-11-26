import type { Metadata } from "next";
import { bookCta, cateringIntro, homeHero } from "@/lib/content";
import { Button } from "@/components/ui/button";
import { Marquee } from "@/components/ui/marquee";
import { Hero } from "@/components/sections/hero";
import { IntroLead } from "@/components/sections/intro-lead";

export const metadata: Metadata = {
  title: "Bakar & Roast | Real Smoke, Bold Flavours",
  description:
    "Wood-fire kitchen in Petaling Jaya. Real smoke, bold flavours. Order online from Bakar & Roast.",
};

/**
 * The front door. A pared-back centred hero over the ember ground, then a short "Who are we"
 * block that the header's "Who are we" link scrolls to (#who). Ordering lives on /menu (Order Now).
 */
export default function HomePage() {
  return (
    <>
      <Hero copy={homeHero} centered action={<Button href={bookCta.href}>{bookCta.label}</Button>} />

      <Marquee className="mt-[72px]" />

      <IntroLead id="who" eyebrow={cateringIntro.eyebrow} lead={cateringIntro.lead} />
    </>
  );
}
