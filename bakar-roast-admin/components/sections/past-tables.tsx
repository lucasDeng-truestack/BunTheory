import type { CateringGalleryImagePublic, CateringTestimonialPublic } from "@/lib/api";
import { pastTablesCopy } from "@/lib/content";
import { Band, Container } from "@/components/ui/band";
import { GalleryRow } from "@/components/sections/gallery-row";
import { SectionHead } from "@/components/sections/motion";
import { Testimonials } from "@/components/sections/testimonials";

/**
 * Gallery and testimonials, shared by /catering and /. Each part is absent when its list is
 * empty; with both empty the whole band is gone (no heading, no placeholder).
 */
export function PastTables({
  gallery,
  testimonials,
}: {
  gallery: CateringGalleryImagePublic[];
  testimonials: CateringTestimonialPublic[];
}) {
  if (!gallery.length && !testimonials.length) return null;
  return (
    <Band>
      {gallery.length > 0 && (
        <GalleryRow
          images={gallery}
          heading={<SectionHead eyebrow={pastTablesCopy.eyebrow}>{pastTablesCopy.galleryHeadline}</SectionHead>}
        />
      )}
      {testimonials.length > 0 && (
        <Container className={gallery.length ? "mt-14" : undefined}>
          {!gallery.length && <SectionHead eyebrow={pastTablesCopy.eyebrow}>{pastTablesCopy.quotesHeadline}</SectionHead>}
          <Testimonials items={testimonials} />
        </Container>
      )}
    </Band>
  );
}
