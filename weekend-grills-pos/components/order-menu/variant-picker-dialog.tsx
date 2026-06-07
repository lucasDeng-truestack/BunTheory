'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import {
  PosProduct,
  PosProductVariant,
  getProductOptionSlots,
  isPosProductOrderable,
} from '@/types/pos';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface VariantPickerDialogProps {
  product: PosProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: {
    product: PosProduct;
    variant: PosProductVariant;
    unitPrice: number;
    choicesSummary: string;
    comboSelections?: Array<{ slotId: string; optionId: string }>;
    remarks: string;
  }) => void;
}

export function VariantPickerDialog({
  product,
  open,
  onOpenChange,
  onConfirm,
}: VariantPickerDialogProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [remarks, setRemarks] = useState('');

  const variants = useMemo(
    () =>
      product
        ? [...product.variants].sort(
            (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
          )
        : [],
    [product],
  );

  const slots = product ? getProductOptionSlots(product) : [];
  const hasSlots = slots.length > 0;
  const orderable = product ? isPosProductOrderable(product) : false;
  const selectedVariant = variants.find((v) => v.id === selectedVariantId) ?? null;

  useEffect(() => {
    if (!open) return;
    setSelectedVariantId(null);
    setSelections({});
    setRemarks('');
  }, [open, product?.id]);

  const { unitPrice, choicesSummary, comboSelections, complete } = useMemo(() => {
    if (!selectedVariant) {
      return {
        unitPrice: 0,
        choicesSummary: '',
        comboSelections: [] as Array<{ slotId: string; optionId: string }>,
        complete: false,
      };
    }

    if (!hasSlots) {
      return {
        unitPrice: selectedVariant.price,
        choicesSummary: selectedVariant.name,
        comboSelections: [] as Array<{ slotId: string; optionId: string }>,
        complete: true,
      };
    }

    let price = selectedVariant.price;
    const parts: string[] = [selectedVariant.name];
    const picks: Array<{ slotId: string; optionId: string }> = [];
    let allRequired = true;

    for (const slot of slots) {
      const optionId = selections[slot.id];
      if (!optionId) {
        if (slot.required) allRequired = false;
        continue;
      }
      const option = slot.options.find((o) => o.id === optionId);
      if (!option) {
        allRequired = false;
        continue;
      }
      price += option.priceDelta;
      picks.push({ slotId: slot.id, optionId: option.id });
      parts.push(
        option.priceDelta > 0
          ? `${option.label} (+RM${option.priceDelta})`
          : option.label,
      );
    }

    return {
      unitPrice: price,
      choicesSummary: parts.join(' · '),
      comboSelections: picks,
      complete: allRequired,
    };
  }, [selectedVariant, selections, slots, hasSlots]);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setSelectedVariantId(null);
      setSelections({});
      setRemarks('');
    }
    onOpenChange(next);
  }

  function handleVariantSelect(variant: PosProductVariant) {
    if (!hasSlots) {
      if (!product) return;
      onConfirm({
        product,
        variant,
        unitPrice: variant.price,
        choicesSummary: variant.name,
        remarks: '',
      });
      handleOpenChange(false);
      return;
    }
    setSelectedVariantId(variant.id);
  }

  function handleConfirm() {
    if (!product || !selectedVariant || !complete) return;
    onConfirm({
      product,
      variant: selectedVariant,
      unitPrice,
      choicesSummary,
      comboSelections: comboSelections.length ? comboSelections : undefined,
      remarks: remarks.trim(),
    });
    handleOpenChange(false);
  }

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          {product.image ? (
            <div className="relative mb-3 aspect-[16/9] w-full overflow-hidden rounded-xl border border-border bg-muted/30">
              <Image
                src={product.image}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 480px"
                unoptimized
              />
            </div>
          ) : null}
          <DialogTitle className="font-display text-xl">{product.name}</DialogTitle>
          {product.description ? (
            <p className="text-sm text-muted-foreground">{product.description}</p>
          ) : null}
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div>
            <p className="mb-2 font-display text-sm font-bold uppercase tracking-wide text-foreground">
              Size
            </p>
            <div className="grid gap-2">
              {variants.map((variant) => {
                const selected = selectedVariantId === variant.id;
                return (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => handleVariantSelect(variant)}
                    className={cn(
                      'flex min-h-14 items-center justify-between rounded-xl border-2 px-4 py-3 font-display transition',
                      selected
                        ? 'border-bbq-flame bg-bbq-flame/10 text-bbq-flame'
                        : 'border-border bg-card hover:border-bbq-flame/40',
                    )}
                  >
                    <span className="text-base font-bold">{variant.name}</span>
                    <span className="text-base font-black tabular-nums">
                      RM {variant.price.toFixed(2)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {hasSlots
            ? slots.map((slot) => (
                <div key={slot.id}>
                  <p className="mb-2 font-display text-sm font-bold uppercase tracking-wide text-foreground">
                    {slot.label}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {slot.options.map((opt) => {
                      const selected = selections[slot.id] === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            setSelections((prev) => ({ ...prev, [slot.id]: opt.id }))
                          }
                          className={cn(
                            'min-h-14 rounded-xl border-2 px-4 py-3 text-left font-display text-sm font-bold transition',
                            selected
                              ? 'border-bbq-flame bg-bbq-flame/10 text-bbq-flame'
                              : 'border-border bg-card hover:border-bbq-flame/40',
                            !selectedVariant && 'opacity-90',
                          )}
                        >
                          {opt.label}
                          {opt.priceDelta > 0 ? (
                            <span className="ml-1 text-xs font-semibold text-bbq-mango">
                              +RM{opt.priceDelta}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            : null}

          {hasSlots ? (
            <div>
              <label className="mb-1 block font-display text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Guest note
              </label>
              <Textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Allergies, extra sauce…"
                rows={2}
                className="resize-none text-sm"
              />
            </div>
          ) : null}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {hasSlots ? (
            <>
              {selectedVariant ? (
                <div className="flex w-full items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                  <span className="font-display text-sm font-bold">Total</span>
                  <span className="font-display text-lg font-black tabular-nums text-bbq-flame">
                    RM {unitPrice.toFixed(2)}
                  </span>
                </div>
              ) : (
                <p className="w-full text-center text-xs text-muted-foreground">
                  Pick a size to see your total
                </p>
              )}
              <Button
                type="button"
                disabled={!complete || !orderable}
                onClick={handleConfirm}
                className="w-full bg-bbq-flame font-display text-base font-bold text-white hover:bg-bbq-flame/90"
              >
                {product?.soldOut ? 'Sold out' : 'Add to order'}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="w-full font-display"
            >
              Cancel
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
