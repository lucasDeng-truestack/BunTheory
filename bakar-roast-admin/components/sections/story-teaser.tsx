import { storyTeaser } from "@/lib/content";
import { Band, Container } from "@/components/ui/band";
import { Button } from "@/components/ui/button";
import { Reveal, RevealPhoto, SectionHead } from "@/components/sections/motion";

/** Home: big photo with a small photo over its corner, heading, two paragraphs, button to /story. */
export function StoryTeaser() {
  return (
    <Band>
      <Container className="grid items-center gap-14 min-[900px]:grid-cols-2">
        <div className="relative pr-10 pt-16 sm:pr-16">
          <RevealPhoto note={storyTeaser.photo} className="aspect-[4/5]" sizes="(min-width: 900px) 50vw, 100vw" />
          <RevealPhoto
            note={storyTeaser.smallPhoto}
            radius="rounded-card-md"
            className="!absolute right-0 top-0 aspect-square w-[46%] border-8 border-ink"
            sizes="25vw"
          />
        </div>
        <div className="grid justify-items-start">
          <SectionHead eyebrow={storyTeaser.eyebrow} size="lg">
            {storyTeaser.headline}
          </SectionHead>
          {storyTeaser.paragraphs.map((p, i) => (
            <Reveal key={i} index={i}>
              <p className="type-body-lg m-0 mb-4 max-w-[46ch] text-cream-muted">{p}</p>
            </Reveal>
          ))}
          <Reveal index={2} className="pt-4">
            <Button href="/story" variant="cream">
              {storyTeaser.action}
            </Button>
          </Reveal>
        </div>
      </Container>
    </Band>
  );
}
