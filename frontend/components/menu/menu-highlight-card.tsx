"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  href: string;
  name: string;
  description: string | null;
  image: string;
  price: number;
};

/** Zoom image when the card is meaningfully in view (scroll “focus”), not on hover. */
export function MenuHighlightCard({
  href,
  name,
  description,
  image,
  price,
}: Props) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [inFocus, setInFocus] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const ratio = entry.intersectionRatio;
        const compact =
          typeof window !== "undefined" &&
          window.matchMedia("(max-width: 639px)").matches;
        const minRatio = compact ? 0.32 : 0.45;
        setInFocus(entry.isIntersecting && ratio >= minRatio);
      },
      {
        root: null,
        rootMargin: "-6% 0px -6% 0px",
        threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.45, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Link
      ref={ref}
      href={href}
      className="group touch-manipulation rounded-2xl border border-charcoal/8 bg-white p-4 shadow-card transition-all duration-300 active:scale-[0.995] [@media(hover:hover)_and_(pointer:fine)]:hover:-translate-y-1 [@media(hover:hover)_and_(pointer:fine)]:hover:shadow-card-hover"
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-charcoal/5">
        <Image
          src={image}
          alt={name}
          fill
          className={cn(
            "object-cover transition-transform duration-500 ease-out motion-reduce:transform-none",
            inFocus ? "scale-[1.05] sm:scale-[1.06]" : "scale-100"
          )}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      </div>

      <div className="mt-4">
        <h3 className="text-lg font-bold text-charcoal transition-colors group-hover:text-deep-red">
          {name}
        </h3>
        {description && (
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-charcoal/60">
            {description}
          </p>
        )}
        <p className="mt-2 text-lg font-bold text-roast-red">
          RM {price.toFixed(2)}
        </p>
      </div>
    </Link>
  );
}
