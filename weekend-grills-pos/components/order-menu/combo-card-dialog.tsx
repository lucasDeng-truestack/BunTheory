'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { PosProduct } from '@/types/pos';
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

interface ComboCardDialogProps {
  product: PosProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: {
    product: PosProduct;
    unitPrice: number;
    choicesSummary: string;
    comboSelections: Array<{ slotId: string; optionId: string }>;
    remarks: string;
  }) => void;
}

export function ComboCardDialog({
  product,
  open,
  onOpenChange,
  onConfirm,
}: ComboCardDialogProps) {
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [remarks, setRemarks] = useState('');

  const slots = product?.combo?.slots ?? [];

  const { unitPrice, choicesSummary, comboSelections, complete } = useMemo(() => {
    if (!product?.combo) {
      return {
        unitPrice: 0,
        choicesSummary: '',
        comboSelections: [] as Array<{ slotId: string; optionId: string }>,
        complete: false,
      };
    }

    let price = product.basePrice;
    const parts: string[] = [];
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
  }, [product, selections, slots]);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setSelections({});
      setRemarks('');
    }
    onOpenChange(next);
  }

  function handleConfirm() {
    if (!product || !complete) return;
    onConfirm({
      product,
      unitPrice,
      choicesSummary,
      comboSelections,
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
          {product.combo?.includesText ? (
            <p className="rounded-lg bg-bbq-cream/60 px-3 py-2 text-xs font-medium text-bbq-charcoal">
              {product.combo.includesText}
            </p>
          ) : null}
        </DialogHeader>

        <div className="space-y-5 py-2">
          {slots.map((slot) => (
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
          ))}

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
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <div className="flex w-full items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
            <span className="font-display text-sm font-bold">Total</span>
            <span className="font-display text-lg font-black tabular-nums text-bbq-flame">
              RM {unitPrice.toFixed(2)}
            </span>
          </div>
          <Button
            type="button"
            disabled={!complete}
            onClick={handleConfirm}
            className="w-full bg-bbq-flame font-display text-base font-bold text-white hover:bg-bbq-flame/90"
          >
            Add to order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
