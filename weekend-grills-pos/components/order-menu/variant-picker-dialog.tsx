'use client';

import Image from 'next/image';
import { PosProduct, PosProductVariant } from '@/types/pos';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VariantPickerDialogProps {
  product: PosProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: {
    product: PosProduct;
    variant: PosProductVariant;
  }) => void;
}

export function VariantPickerDialog({
  product,
  open,
  onOpenChange,
  onConfirm,
}: VariantPickerDialogProps) {
  if (!product) return null;

  const variants = [...product.variants].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          {product.image ? (
            <div className="relative mb-3 aspect-[16/9] w-full overflow-hidden rounded-xl border border-border bg-muted/30">
              <Image
                src={product.image}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 448px"
                unoptimized
              />
            </div>
          ) : null}
          <DialogTitle className="font-display text-xl">{product.name}</DialogTitle>
          {product.description ? (
            <p className="text-sm text-muted-foreground">{product.description}</p>
          ) : null}
        </DialogHeader>

        <div className="grid gap-2 py-2">
          {variants.map((variant) => (
            <button
              key={variant.id}
              type="button"
              onClick={() => {
                onConfirm({ product, variant });
                onOpenChange(false);
              }}
              className={cn(
                'flex min-h-16 items-center justify-between rounded-xl border-2 border-border bg-card px-4 py-3',
                'font-display text-left transition hover:border-bbq-flame hover:bg-bbq-flame/5',
              )}
            >
              <span className="text-base font-bold">{variant.name}</span>
              <span className="text-base font-black tabular-nums text-bbq-flame">
                RM {variant.price.toFixed(2)}
              </span>
            </button>
          ))}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full font-display"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
