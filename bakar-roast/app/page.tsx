import type { Metadata } from "next";
import { getAvailability, getGallery, getTestimonials } from "@/lib/catering-api";
import { bookCta, homeHero } from "@/lib/content";
import { firstOpenDate, formatShort } from "@/lib/dates";
import { safe } from "@/lib/safe";
import { Band, Container } from "@/components/ui/band";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/pill";
import { CtaBand } from "@/components/ui/cta-band";
import { Hero } from "@/components/sections/hero";
import { Ventures } from "@/components/sections/ventures";
import { StoryTeaser } from "@/components/sections/story-teaser";
import { PastTables } from "@/components/sections/past-tables";

export const metadata: Metadata = {
  title: "Bakar & Roast | Fire. Feast. Family.",
  description:
    "Wood-fire catering from Petaling Jaya, Kuala Lumpur. Home of The Bun Theory and The Weekend Grill.",
};

export default async function HomePage() {
  const [gallery, testimonials, availability] = await Promise.all([
    safe(getGallery(), []),
    safe(getTestimonials(), []),
    safe(getAvailability(), null),
  ]);
  const nextOpen = availability && firstOpenDate(availability);

  return (
    <>
      <Hero
        copy={homeHero}
        stamp
        action={<Button href={bookCta.href}>{bookCta.label}</Button>}
        chips={
          <>
            <Chip>Now booking</Chip>
            {nextOpen && <Chip tone="cream">Next open date: {formatShort(nextOpen)}</Chip>}
          </>
        }
      />
      <div className="h-[clamp(56px,7vw,96px)]" />
      <Ventures />
      <StoryTeaser />
      <PastTables gallery={gallery} testimonials={testimonials} />
      <Band>
        <Container>
          <CtaBand />
        </Container>
      </Band>
    </>
  );
}
