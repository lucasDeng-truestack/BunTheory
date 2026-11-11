"use client";

import { useRef, type CSSProperties } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { bookCta } from "@/lib/content";
import { Button } from "@/components/ui/button";
import { Headline } from "@/components/ui/headline";
import { PhotoSlot } from "@/components/ui/photo-slot";
import { Magnetic } from "@/components/magnetic";

/**
 * Closing band at the end of every public page: "Tell us about your table." and one
 * "Check a date" button to /catering/book. radius-lg with the ember glow.
 * On the ember gradient (no `src`) the accent word is ink and the button cream; over a real
 * dark photo the accent goes back to ember and the button to ember.
 * Grows from an inset rounded shape to full size while its photo settles from 1.3x.
 * Place it inside a <Band> + <Container>.
 */
export function CtaBand({
  src,
  note = "Photo: embers at night, wide and dark.",
  alt,
}: {
  src?: string | null;
  note?: string;
  alt?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const scale = useTransform(scrollYProgress, [0, 1], [0.86, 1]);
  const photoScale = useTransform(scrollYProgress, [0, 1], [1.3, 1]);
  const onPhoto = !!src;

  // On the gradient: ink accent; cream ring so focus shows over both the ink and ember areas.
  const tone = (onPhoto
    ? {}
    : { "--tone-accent": "#0B0908", "--tone-ring": "#F4ECE1" }) as CSSProperties;

  return (
    <motion.section
      ref={ref}
      style={{ ...tone, scale }}
      className="relative isolate grid motion-reduce:!transform-none justify-items-center gap-7 overflow-hidden rounded-card-lg px-6 py-[72px] text-center text-cream shadow-glow-ember sm:py-28"
    >
      <motion.div aria-hidden={!onPhoto} className="absolute inset-0 -z-10 motion-reduce:!transform-none" style={{ scale: photoScale }}>
        <PhotoSlot
          src={src}
          alt={alt}
          note={note}
          radius="none"
          sizes="(min-width: 1440px) 1328px, 100vw"
          className={onPhoto ? "h-full justify-end" : "cta-gradient h-full justify-end"}
          imageClassName="brightness-[.55]"
        />
      </motion.div>
      <Headline size="xl" as="h2" headingClassName="text-[clamp(44px,8vw,112px)]">
        Tell us about
        <br />
        your <em>table.</em>
      </Headline>
      <Magnetic>
        <Button href={bookCta.href} variant={onPhoto ? "ember" : "cream"}>
          {bookCta.label}
        </Button>
      </Magnetic>
    </motion.section>
  );
}
