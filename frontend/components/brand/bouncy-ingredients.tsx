"use client";

import Image from "next/image";
import { m, useReducedMotion, type Variants } from "motion/react";
import { cn } from "@/lib/utils";

type Ingredient = {
  src: string;
  alt: string;
  /** Scatter position within the layer (percentages of the container). */
  pos: { top: string; left: string };
  /** Rendered width; height follows the 3:2 source ratio. */
  sizeClass: string;
  /** Resting tilt once it lands (degrees). */
  rotate: number;
};

/**
 * Cut-out ingredient sprites scattered around the section rather than lined up
 * in a neat row. Positions bleed toward the edges so the centered heading stays
 * clear while the ingredients frame it.
 */
const INGREDIENTS: Ingredient[] = [
  {
    src: "/images/ingredients/ingredient-bun.webp",
    alt: "Sesame brioche bun",
    pos: { top: "2%", left: "2%" },
    sizeClass: "w-20 sm:w-32",
    rotate: -11,
  },
  {
    src: "/images/ingredients/ingredient-tomato.webp",
    alt: "Ripe tomato slice",
    pos: { top: "0%", left: "72%" },
    sizeClass: "w-16 sm:w-24",
    rotate: 13,
  },
  {
    src: "/images/ingredients/ingredient-lettuce.webp",
    alt: "Fresh lettuce leaf",
    pos: { top: "46%", left: "0%" },
    sizeClass: "w-20 sm:w-28",
    rotate: -7,
  },
  {
    src: "/images/ingredients/ingredient-chili.webp",
    alt: "Red chili",
    pos: { top: "40%", left: "68%" },
    sizeClass: "w-24 sm:w-40",
    rotate: 9,
  },
  {
    src: "/images/ingredients/ingredient-bacon.webp",
    alt: "Crispy bacon",
    pos: { top: "74%", left: "6%" },
    sizeClass: "w-24 sm:w-40",
    rotate: -15,
  },
  {
    src: "/images/ingredients/ingredient-cheese.webp",
    alt: "Melting cheddar",
    pos: { top: "72%", left: "68%" },
    sizeClass: "w-16 sm:w-24",
    rotate: 15,
  },
];

type BouncyIngredientsProps = {
  className?: string;
};

const container: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
};

const pop: Variants = {
  hidden: { y: 50, opacity: 0, scale: 0.4, rotate: 0 },
  visible: (rotate: number) => ({
    y: 0,
    opacity: 1,
    scale: 1,
    rotate,
    transition: { type: "spring", damping: 8, stiffness: 240, mass: 0.6 },
  }),
};

export function BouncyIngredients({ className }: BouncyIngredientsProps) {
  const reduce = useReducedMotion();

  if (reduce) {
    return (
      <div className={cn("pointer-events-none select-none", className)} aria-hidden>
        {INGREDIENTS.map((it) => (
          <span
            key={it.src}
            className="absolute"
            style={{ top: it.pos.top, left: it.pos.left, rotate: `${it.rotate}deg` }}
          >
            <Image
              src={it.src}
              alt={it.alt}
              width={512}
              height={341}
              sizes="(max-width: 640px) 30vw, 160px"
              className={cn("h-auto", it.sizeClass)}
            />
          </span>
        ))}
      </div>
    );
  }

  return (
    <m.div
      className={cn("pointer-events-none select-none", className)}
      variants={container}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: false, margin: "0px 0px -15% 0px" }}
      aria-hidden
    >
      {INGREDIENTS.map((it, i) => (
        <m.div
          key={it.src}
          className="absolute will-change-transform"
          style={{ top: it.pos.top, left: it.pos.left }}
          variants={pop}
          custom={it.rotate}
        >
          {/* Nested element carries the endless idle float so it composes with the pop entrance. */}
          <m.div
            animate={{ y: [0, -12, 0], rotate: [0, i % 2 ? 5 : -5, 0] }}
            transition={{
              duration: 2.2 + (i % 4) * 0.45,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.15,
            }}
          >
            <Image
              src={it.src}
              alt={it.alt}
              width={512}
              height={341}
              sizes="(max-width: 640px) 30vw, 160px"
              className={cn(
                "h-auto drop-shadow-[4px_6px_6px_rgba(23,18,14,0.22)]",
                it.sizeClass
              )}
            />
          </m.div>
        </m.div>
      ))}
    </m.div>
  );
}
