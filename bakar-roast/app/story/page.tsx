import type { Metadata } from "next";
import { chaptersCopy, founders, storyChapters, storyHero, storyIntro, values } from "@/lib/content";
import { Band, Container } from "@/components/ui/band";
import { CtaBand } from "@/components/ui/cta-band";
import { Hero } from "@/components/sections/hero";
import { IntroLead } from "@/components/sections/intro-lead";
import { Timeline } from "@/components/sections/timeline";
import { ValuesList } from "@/components/sections/values-list";
import { Reveal, RevealPhoto, SectionHead } from "@/components/sections/motion";

export const metadata: Metadata = {
  title: "Our story | Bakar & Roast",
  description:
    "From a pandemic kitchen to a Christmas table to catering across Petaling Jaya. The story of Bakar & Roast, John Zachariah and Grace Sheila.",
};

export default function StoryPage() {
  return (
    <>
      {/* The prototype's 11vw, less the kerning the per-letter spans lose, so it stays one line at 1440. */}
      <Hero copy={storyHero} headingClassName="text-[length:clamp(56px,10.5vw,151px)]" />

      <IntroLead eyebrow={storyIntro.eyebrow} lead={storyIntro.lead} />

      <Band tone="raised">
        <Container>
          <SectionHead eyebrow={founders.eyebrow}>{founders.headline}</SectionHead>
          <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr))]">
            {founders.people.map((f, i) => (
              <Reveal key={f.name} index={i} className="grid gap-4">
                <RevealPhoto note={f.photo} className="aspect-[4/5]" sizes="(min-width: 900px) 50vw, 100vw" />
                <h3 className="m-0 font-display text-[40px] font-extrabold uppercase leading-[0.9] [font-stretch:80%]">
                  {f.name}
                </h3>
                <p className="m-0 text-cream-muted">{f.line}</p>
              </Reveal>
            ))}
          </div>
        </Container>
      </Band>

      <Band>
        <Container>
          <SectionHead eyebrow={chaptersCopy.eyebrow}>{chaptersCopy.headline}</SectionHead>
          <Timeline chapters={storyChapters} />
        </Container>
      </Band>

      <Band tone="raised">
        <Container>
          <SectionHead eyebrow={values.eyebrow}>{values.headline}</SectionHead>
          <ValuesList items={values.items} />
        </Container>
      </Band>

      <Band>
        <Container>
          <CtaBand />
        </Container>
      </Band>
    </>
  );
}
