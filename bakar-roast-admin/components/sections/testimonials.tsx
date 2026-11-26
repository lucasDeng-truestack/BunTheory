import type { CateringTestimonialPublic } from "@/lib/api";
import { Reveal } from "@/components/sections/motion";

/** Owner-managed client quotes. Renders nothing when the list is empty. */
export function Testimonials({ items, className }: { items: CateringTestimonialPublic[]; className?: string }) {
  if (!items.length) return null;
  return (
    <div className={className}>
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))]">
        {items.map((t, i) => (
          <Reveal key={t.id} as="figure" index={i} className="m-0 grid content-between gap-6 rounded-card-md bg-ink-raised p-8">
            <blockquote className="m-0 text-2xl font-medium leading-[1.3]">{t.quote}</blockquote>
            <figcaption className="grid text-sm text-cream-muted">
              <b className="text-base text-cream">{t.name}</b>
              {t.role}
            </figcaption>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
