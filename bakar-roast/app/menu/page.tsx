import type { Metadata } from "next";
import { bookCta, menuHero, menuSections } from "@/lib/content";
import { Band, Container } from "@/components/ui/band";
import { Button } from "@/components/ui/button";
import { CtaBand } from "@/components/ui/cta-band";
import { Hero } from "@/components/sections/hero";
import { ListRows } from "@/components/sections/list-rows";
import { SectionHead } from "@/components/sections/motion";

export const metadata: Metadata = {
  title: "Menu | Bakar & Roast",
  description:
    "The Bakar & Roast menu, led by our apple-wood roast chicken. Catering menus are built around your table.",
};

export default function MenuPage() {
  // Rows number straight through the page, like a menu card.
  let start = 1;
  return (
    <>
      <Hero copy={menuHero} action={<Button href={bookCta.href}>{bookCta.label}</Button>} />
      {menuSections.map((section, i) => {
        const first = start;
        start += section.items.length;
        return (
          <Band key={section.eyebrow} tone={i % 2 ? "raised" : "base"} className={i === 0 ? "!pt-[clamp(56px,7vw,96px)]" : undefined}>
            <Container>
              <SectionHead eyebrow={section.eyebrow}>{section.headline}</SectionHead>
              <ListRows label={section.eyebrow} items={section.items} start={first} />
            </Container>
          </Band>
        );
      })}
      <Band>
        <Container>
          <CtaBand />
        </Container>
      </Band>
    </>
  );
}
