import { ventures, venturesCopy } from "@/lib/content";
import { Band, Container } from "@/components/ui/band";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/pill";
import { Reveal, RevealPhoto, SectionHead } from "@/components/sections/motion";

/**
 * Home: the three kitchens. Catering is the wide flagship card (into the booking flow);
 * The Bun Theory and The Weekend Grill follow as the track record behind it.
 */
export function Ventures() {
  const [catering, ...rest] = ventures;
  return (
    <Band tone="raised">
      <Container>
        <SectionHead eyebrow={venturesCopy.eyebrow}>{venturesCopy.headline}</SectionHead>
        <p className="type-body-lg -mt-4 mb-12 max-w-[52ch] text-cream-muted">{venturesCopy.intro}</p>

        <Reveal className="grid overflow-hidden rounded-card-lg bg-ink min-[900px]:grid-cols-2">
          <div className="relative">
            <RevealPhoto note={catering.photo} radius="" className="h-full min-h-[280px]" sizes="(min-width: 900px) 50vw, 100vw" />
            <div className="absolute left-4 top-4">
              <Chip>{catering.badge}</Chip>
            </div>
          </div>
          <div className="grid content-center justify-items-start gap-5 p-6 sm:p-12">
            <h3 className="display-lg m-0">{catering.name}</h3>
            <p className="m-0 text-xl font-semibold">{catering.line}</p>
            <p className="type-body-lg m-0 max-w-[44ch] text-cream-muted">{catering.body}</p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button href={catering.href} variant="cream">
                {catering.cta}
              </Button>
              {catering.more && (
                <Button href={catering.more.href} variant="ghost">
                  {catering.more.label}
                </Button>
              )}
            </div>
          </div>
        </Reveal>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {rest.map((v, i) => (
            <Reveal key={v.key} index={i + 1} className="grid content-start overflow-hidden rounded-card-lg bg-ink">
              <RevealPhoto note={v.photo} radius="" className="aspect-[16/10]" sizes="(min-width: 768px) 50vw, 100vw" />
              <div className="grid justify-items-start gap-3 p-6 sm:p-8">
                <h3 className="display-sm m-0">{v.name}</h3>
                <p className="m-0 font-semibold">{v.line}</p>
                <p className="m-0 text-cream-muted">{v.body}</p>
                <Button
                  href={v.href}
                  variant="ghost"
                  className="mt-3"
                  {...(v.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                >
                  {v.cta}
                </Button>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </Band>
  );
}
