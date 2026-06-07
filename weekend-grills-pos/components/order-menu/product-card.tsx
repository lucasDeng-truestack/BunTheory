'use client';

import Image from 'next/image';
import { Pencil, Trash2 } from 'lucide-react';
import { PosProduct, isPosProductOrderable } from '@/types/pos';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  product: PosProduct;
  editMode?: boolean;
  onTap: (product: PosProduct) => void;
  onEdit?: (product: PosProduct) => void;
  onDelete?: (product: PosProduct) => void;
}

function priceLabel(product: PosProduct): string {
  if (product.type === 'VARIANT' && product.variants.length > 0) {
    const min = Math.min(...product.variants.map((v) => v.price));
    return `From RM ${min.toFixed(2)}`;
  }
  return `RM ${product.basePrice.toFixed(2)}`;
}

function typeBadge(product: PosProduct) {
  if (product.type === 'COMBO') return 'Combo';
  if (product.type === 'VARIANT') return 'Pick size';
  return null;
}

export function ProductCard({
  product,
  editMode,
  onTap,
  onEdit,
  onDelete,
}: ProductCardProps) {
  const badge = typeBadge(product);
  const orderable = isPosProductOrderable(product);
  const disabled = !editMode && !orderable;

  return (
    <div
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition',
        !editMode && orderable && 'cursor-pointer hover:border-bbq-flame/50 hover:shadow-md',
        disabled && 'opacity-60',
      )}
    >
      <button
        type="button"
        disabled={editMode || !orderable}
        onClick={() => onTap(product)}
        className={cn(
          'flex flex-1 flex-col text-left',
          disabled && 'cursor-not-allowed',
        )}
      >
        {product.image ? (
          <div className="relative aspect-[4/3] w-full overflow-hidden border-b border-border bg-muted/30">
            <Image
              src={product.image}
              alt={product.name}
              fill
              className={cn('object-cover', disabled && 'grayscale-[0.35]')}
              sizes="(max-width: 768px) 50vw, 240px"
              unoptimized
            />
            {product.soldOut ? (
              <div className="absolute inset-0 flex items-center justify-center bg-sidebar/55">
                <Badge
                  variant="secondary"
                  className="font-display text-xs px-3 py-1 shadow-sm"
                >
                  Sold out
                </Badge>
              </div>
            ) : null}
            {!product.available && !product.soldOut ? (
              <div className="absolute inset-0 flex items-center justify-center bg-sidebar/50">
                <Badge
                  variant="destructive"
                  className="font-display text-xs px-3 py-1 shadow-sm"
                >
                  Unavailable
                </Badge>
              </div>
            ) : null}
          </div>
        ) : (
          <>
            {product.soldOut ? (
              <div className="border-b border-border bg-muted/40 px-4 py-2 text-center">
                <Badge variant="secondary" className="font-display text-xs">
                  Sold out
                </Badge>
              </div>
            ) : null}
            {!product.available && !product.soldOut ? (
              <div className="border-b border-border bg-muted/40 px-4 py-2 text-center">
                <Badge variant="destructive" className="font-display text-xs">
                  Unavailable
                </Badge>
              </div>
            ) : null}
          </>
        )}
        <div className="flex flex-1 flex-col p-4">
          <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
            <h3 className="font-display text-base font-black leading-tight text-foreground">
              {product.name}
            </h3>
            {badge ? (
              <Badge variant="secondary" className="shrink-0 font-display text-[10px]">
                {badge}
              </Badge>
            ) : null}
          </div>
          {product.description ? (
            <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">
              {product.description}
            </p>
          ) : null}
          <p className="mt-auto font-display text-sm font-black tabular-nums text-bbq-flame">
            {priceLabel(product)}
          </p>
        </div>
      </button>

      {editMode ? (
        <div className="flex border-t border-border">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="flex-1 rounded-none font-display text-xs"
            onClick={() => onEdit?.(product)}
          >
            <Pencil className="mr-1 h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="flex-1 rounded-none font-display text-xs text-destructive hover:bg-destructive/10"
            onClick={() => onDelete?.(product)}
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      ) : null}
    </div>
  );
}
