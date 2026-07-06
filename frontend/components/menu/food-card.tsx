"use client";

import Image from "next/image";
import { Plus, ListChecks } from "lucide-react";
import { Sticker } from "@/components/brand/sticker";
import type { MenuItem } from "@/types/menu";
import { formatRM } from "@/lib/money";
import { resolveItemImage } from "@/lib/storefront-display";
import { cn } from "@/lib/utils";

interface FoodCardProps {
  item: MenuItem;
  onOpen: (item: MenuItem) => void;
  /** Quick-add from the "+" button (parent decides add-directly vs open modal); receives the button rect for the fly-to-cart animation. */
  onAdd?: (item: MenuItem, rect: DOMRect) => void;
  /** Eager-load the image (first card, above the fold — LCP). */
  priority?: boolean;
}

/**
 * CRAV-style menu card: bold bordered panel on the checker grid, a yellow price
 * sticker + round "+" add button over the photo, and clear sold-out / unavailable
 * overlays. Clicking anywhere (or the "+") opens the options modal — add-to-cart
 * logic is unchanged, this is presentation only.
 */
export function FoodCard({ item, onOpen, onAdd, priority }: FoodCardProps) {
  const disabled = item.soldOut || !item.available;
  const hasOptions = item.optionGroups.length > 0;
  const imageSrc = resolveItemImage(item);
  const hasOwnImage = Boolean(item.image?.trim());

  const open = () => {
    if (!disabled) onOpen(item);
  };

  const handleAddClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (disabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (onAdd) onAdd(item, rect);
    else open();
  };

  return (
    <div
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-4xl border-2 border-bun-ink bg-white text-left shadow-sticker transition-transform duration-200",
        disabled
          ? "cursor-not-allowed"
          : "cursor-pointer hover:-translate-y-1 focus-within:ring-2 focus-within:ring-bun-red focus-within:ring-offset-2"
      )}
    >
      <div className="relative aspect-[5/4] shrink-0 overflow-hidden bg-item-photo">
        <Image
          src={imageSrc}
          alt={item.name}
          fill
          priority={priority}
          className={cn(
            "transition-transform duration-500 ease-out",
            hasOwnImage ? "object-cover" : "object-contain p-6",
            !disabled && "group-hover:scale-[1.04]",
            disabled && "opacity-60"
          )}
          sizes="(max-width: 768px) 100vw, 360px"
        />

        {/* Price sticker — peels off the card on hover */}
        <Sticker tone="yellow" rotate={-8} className="peel-sticker absolute left-3 top-3 px-3 py-1.5">
          {formatRM(item.price)}
        </Sticker>

        {/* Sold-out / unavailable overlay */}
        {disabled && (
          <div className="absolute inset-0 flex items-center justify-center bg-bun-ink/55 backdrop-blur-[1px]">
            <Sticker tone={item.soldOut ? "red" : "black"} rotate={-6} className="text-base">
              {item.soldOut ? "Sold out" : "Unavailable"}
            </Sticker>
          </div>
        )}

        {/* Yellow "+" add button — z-20 keeps it clickable above the card's stretched hit-area */}
        {!disabled && (
          <button
            type="button"
            onClick={handleAddClick}
            aria-label={`Add ${item.name}`}
            className="absolute bottom-3 right-3 z-20 inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-bun-ink bg-bun-yellow text-bun-ink shadow-sticker transition-transform hover:scale-110 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bun-red focus-visible:ring-offset-2"
          >
            <Plus className="h-6 w-6" strokeWidth={3} />
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-xl font-bold leading-tight text-bun-ink">
          {disabled ? (
            item.name
          ) : (
            // Stretched hit-area: the ::after overlays the whole card so a click
            // anywhere opens the item, while staying a single real, focusable button.
            <button
              type="button"
              onClick={open}
              aria-label={`Add ${item.name}`}
              className="text-left outline-none after:absolute after:inset-0 after:content-[''] focus:outline-none"
            >
              {item.name}
            </button>
          )}
        </h3>
        {item.description ? (
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-bun-ink-soft">
            {item.description}
          </p>
        ) : null}
        <div className="min-h-0 flex-1" aria-hidden />
        {hasOptions && !disabled ? (
          <p className="mt-3 inline-flex items-center gap-1.5 font-display text-xs font-semibold uppercase tracking-wide text-bun-red-deep">
            <ListChecks className="h-3.5 w-3.5" />
            Customisable
          </p>
        ) : null}
      </div>
    </div>
  );
}
