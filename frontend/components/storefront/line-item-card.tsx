"use client";

import Image from "next/image";
import { Minus, Plus, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRM } from "@/lib/money";
import { resolveItemImage } from "@/lib/storefront-display";

export interface LineItemCardProps {
  name: string;
  image?: string | null;
  /** Short chosen-options summary, e.g. "Large · Coke". */
  optionsSummary?: string | null;
  remarks?: string | null;
  unitPrice: number;
  quantity: number;
  /** Read-only rendering (e.g. confirm screen): shows "× qty", no controls. */
  readOnly?: boolean;
  onIncrement?: () => void;
  onDecrement?: () => void;
  onEdit?: () => void;
  onRemove?: () => void;
  className?: string;
}

/**
 * Cart / checkout line item: thumbnail, name, options + remarks, line total and
 * (when interactive) a quantity stepper plus edit / remove controls.
 */
export function LineItemCard({
  name,
  image,
  optionsSummary,
  remarks,
  unitPrice,
  quantity,
  readOnly = false,
  onIncrement,
  onDecrement,
  onEdit,
  onRemove,
  className,
}: LineItemCardProps) {
  const lineTotal = unitPrice * quantity;

  return (
    <div
      className={cn(
        "flex gap-3 rounded-3xl border-2 border-bun-ink bg-white p-3 shadow-sticker",
        className
      )}
    >
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 border-bun-ink/15 bg-item-photo">
        <Image
          src={resolveItemImage({ image })}
          alt={name}
          fill
          className={image?.trim() ? "object-cover" : "object-contain p-2"}
          sizes="80px"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display font-bold leading-snug text-bun-ink">
            {name}
          </h3>
          {readOnly ? (
            <span className="shrink-0 text-sm font-semibold text-bun-ink-soft">
              × {quantity}
            </span>
          ) : null}
        </div>

        {optionsSummary ? (
          <p className="mt-0.5 truncate text-sm text-bun-ink-soft">
            {optionsSummary}
          </p>
        ) : null}
        {remarks ? (
          <p className="mt-0.5 truncate text-sm italic text-bun-ink-soft/70">
            “{remarks}”
          </p>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <p className="font-display font-bold text-bun-red">{formatRM(lineTotal)}</p>

          {readOnly ? null : (
            <div className="flex items-center gap-1">
              {onEdit ? (
                <button
                  type="button"
                  onClick={onEdit}
                  aria-label={`Edit ${name}`}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-bun-ink-soft transition-colors hover:bg-bun-cream-soft hover:text-bun-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bun-red"
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                </button>
              ) : null}

              <QtyStepper
                quantity={quantity}
                onIncrement={onIncrement}
                onDecrement={onDecrement}
                onRemove={onRemove}
                name={name}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QtyStepper({
  quantity,
  onIncrement,
  onDecrement,
  onRemove,
  name,
}: {
  quantity: number;
  onIncrement?: () => void;
  onDecrement?: () => void;
  onRemove?: () => void;
  name: string;
}) {
  // At qty 1 the "minus" becomes a remove (trash) affordance.
  const atFloor = quantity <= 1;
  const handleDown = atFloor ? onRemove : onDecrement;

  return (
    <div className="flex items-center gap-1 rounded-full border-2 border-bun-ink bg-bun-cream-soft p-0.5">
      <button
        type="button"
        onClick={handleDown}
        aria-label={atFloor ? `Remove ${name}` : `Decrease ${name}`}
        className="flex h-8 w-8 items-center justify-center rounded-full text-bun-ink transition-colors hover:bg-bun-yellow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bun-red"
      >
        {atFloor ? (
          <Trash2 className="h-4 w-4 text-bun-red" aria-hidden />
        ) : (
          <Minus className="h-4 w-4" strokeWidth={3} aria-hidden />
        )}
      </button>
      <span className="min-w-[1.5rem] text-center font-display font-bold text-bun-ink">
        {quantity}
      </span>
      <button
        type="button"
        onClick={onIncrement}
        aria-label={`Increase ${name}`}
        className="flex h-8 w-8 items-center justify-center rounded-full text-bun-ink transition-colors hover:bg-bun-yellow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bun-red"
      >
        <Plus className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
