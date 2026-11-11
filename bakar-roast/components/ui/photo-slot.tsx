import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PhotoRadius = "lg" | "md" | "sm" | "none";

const radiusClass: Record<PhotoRadius, string> = {
  lg: "rounded-card-lg",
  md: "rounded-card-md",
  sm: "rounded-card-sm",
  none: "",
};

/**
 * Every photo sits in this frame over the ember gradient, so an empty slot looks intentional.
 * Without `src`, the `note` ("Photo: ...") says what the real photo should show.
 * With `src`, the note is hidden and becomes the alt text unless `alt` is given.
 * `children` render top left (the hero's chips). Size the frame with className
 * (min-h-*, aspect-*); the default minimum height is 200px (96px for radius "sm").
 */
export function PhotoSlot({
  src,
  alt,
  note,
  radius = "lg",
  sizes = "100vw",
  priority,
  className,
  imageClassName,
  children,
}: {
  src?: string | null;
  alt?: string;
  note?: string;
  radius?: PhotoRadius;
  sizes?: string;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "photo-gradient relative isolate flex items-end overflow-hidden p-4",
        radius === "sm" ? "min-h-24" : "min-h-[200px]",
        radiusClass[radius],
        className,
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={alt ?? note?.replace(/^Photo:\s*/, "") ?? ""}
          fill
          sizes={sizes}
          priority={priority}
          className={cn("-z-10 object-cover", imageClassName)}
        />
      ) : (
        note && (
          <span className="max-w-[32ch] rounded-lg bg-ink/80 px-2.5 py-1.5 text-[13px] leading-[1.3] text-cream">
            {note}
          </span>
        )
      )}
      {children && <div className="absolute left-4 top-4 flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}
