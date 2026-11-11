import { bookCta, statusCopy, waLink } from "@/lib/content";
import { Band, Container } from "@/components/ui/band";
import { Button } from "@/components/ui/button";
import { Headline } from "@/components/ui/headline";
import { accent } from "@/components/sections/accent";

/** A bad or old status link. */
export default function BookingNotFound() {
  const c = statusCopy.notFound;
  return (
    <Band className="pt-[calc(120px+env(safe-area-inset-top))]">
      <Container>
        <div className="grid max-w-[820px] justify-items-start gap-6">
          <Headline as="h1" size="lg" eyebrow={c.eyebrow}>
            {accent(c.headline)}
          </Headline>
          <p className="type-body-lg m-0 text-cream-muted">{c.body}</p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <Button href={bookCta.href}>{bookCta.label}</Button>
            <a
              href={waLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center font-semibold text-cream underline decoration-ember underline-offset-4"
            >
              Message us
            </a>
          </div>
        </div>
      </Container>
    </Band>
  );
}
