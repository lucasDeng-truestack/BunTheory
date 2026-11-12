import type { Metadata } from "next";
import {
  getAvailability,
  getCateringRules,
  getGallery,
  getPackages,
  getTestimonials,
} from "@/lib/catering-api";
import {
  bookCta,
  cateringIntro,
  cateringOccasions,
  cateringSteps,
  packagesCopy,
  fallbackRules,
  homeHero,
  waLink,
} from "@/lib/content";
import { firstOpenDate, formatShort } from "@/lib/dates";
import { safe } from "@/lib/safe";
import { Band, Container } from "@/components/ui/band";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/pill";
import { CtaBand } from "@/components/ui/cta-band";
import { Marquee } from "@/components/ui/marquee";
import { Hero } from "@/components/sections/hero";
import { IntroLead } from "@/components/sections/intro-lead";
import { ListRows } from "@/components/sections/list-rows";
import { PackageStack } from "@/components/sections/package-card";
import { StepCards } from "@/components/sections/step-cards";
import { StatRow } from "@/components/sections/stat-row";
import { PastTables } from "@/components/sections/past-tables";
import { ChatBlock } from "@/components/sections/chat-block";
import { Ventures } from "@/components/sections/ventures";
import { StoryTeaser } from "@/components/sections/story-teaser";
import { Reveal, SectionHead } from "@/components/sections/motion";

export const metadata: Metadata = {
  title: "Bakar & Roast | Wood-fire catering in Petaling Jaya",
  description:
    "Wood-fire catering for house gatherings, celebrations and community tables across Petaling Jaya and Kuala Lumpur. Pick a date and we cook at your place. Home of The Bun Theory and The Weekend Grill.",
};

/**
 * The front door, and the catering page (catering is the flagship, so there is one page for it,
 * not two). Brand hero, then everything a catering customer needs, then the other two kitchens
 * and the story as the track record behind it. /catering redirects here (next.config.mjs).
 */
export default async function HomePage() {
  const [packages, gallery, testimonials, rules, availability] = await Promise.all([
    safe(getPackages(), null),
    safe(getGallery(), []),
    safe(getTestimonials(), []),
    safe(getCateringRules(), fallbackRules),
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

      <Marquee className="mt-[72px]" />

      <IntroLead eyebrow={cateringIntro.eyebrow} lead={cateringIntro.lead} />

      <Band tone="raised">
        <Container>
          <SectionHead eyebrow="Occasions">Any table, *fed.*</SectionHead>
          <ListRows
            label="Occasions we cater"
            items={cateringOccasions.map((o) => ({
              title: o.title,
              photo: o.photo,
              href: `/catering/book?occasion=${encodeURIComponent(o.occasion)}`,
            }))}
          />
        </Container>
      </Band>

      {packages === null ? (
        <Band id="packages">
          <Container>
            <SectionHead eyebrow={packagesCopy.eyebrow}>Pick your *fire.*</SectionHead>
            <Reveal className="grid max-w-[44ch] justify-items-start gap-6">
              <p className="type-body-lg m-0 text-cream-muted">{packagesCopy.failed}</p>
              <Button href={waLink("Hi Bakar & Roast, I would like to hear about your catering packages.")} variant="cream" target="_blank" rel="noopener noreferrer">
                Message us
              </Button>
            </Reveal>
          </Container>
        </Band>
      ) : (
        packages.length > 0 && (
          <Band id="packages">
            <Container>
              <SectionHead eyebrow={packagesCopy.eyebrow}>Pick your *fire.*</SectionHead>
              <PackageStack packages={packages} />
            </Container>
          </Band>
        )
      )}

      <Band tone="cream">
        <Container>
          <SectionHead eyebrow="How it works">Four steps to a *full* table.</SectionHead>
          <StepCards steps={cateringSteps} />
        </Container>
      </Band>

      <Band tone="raised">
        <Container>
          <StatRow windowMonths={rules.cateringBookingWindowMonths} />
        </Container>
      </Band>

      <PastTables gallery={gallery} testimonials={testimonials} />

      <Ventures only="others" />

      <StoryTeaser />

      <ChatBlock />

      <Band>
        <Container>
          <CtaBand />
        </Container>
      </Band>
    </>
  );
}
