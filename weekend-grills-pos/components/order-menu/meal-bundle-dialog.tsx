'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { PosMenuItem } from '@/types/pos';
import { cn } from '@/lib/utils';

export interface MealBundleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Main anchor item; dialog is inert without it. */
  main: PosMenuItem | null;
  sides: PosMenuItem[];
  drinks: PosMenuItem[];
  /** Called once with main + extras; parent persists to cart. */
  onConfirm: (payload: {
    mainQuantity: number;
    mainRemarks: string;
    extras: Array<{ item: PosMenuItem; quantity: number }>;
  }) => void;
}

function uniqById(items: PosMenuItem[]): PosMenuItem[] {
  const seen = new Set<string>();
  return items.filter((i) => {
    if (seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  });
}

function ExtraQtyRow({
  item,
  quantity,
  onChange,
}: {
  item: PosMenuItem;
  quantity: number;
  onChange: (q: number) => void;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 px-2.5 py-2',
        quantity > 0 && 'border-bbq-flame/35 bg-accent/40',
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-sm font-bold text-foreground">
          {item.name}
        </p>
        <p className="text-xs tabular-nums text-muted-foreground">
          RM {item.price.toFixed(2)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="h-8 w-8 font-display"
          onClick={() => onChange(Math.max(0, quantity - 1))}
          aria-label={`Decrease ${item.name}`}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="w-7 text-center font-display text-sm font-black tabular-nums">
          {quantity}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="h-8 w-8 font-display"
          onClick={() => onChange(quantity + 1)}
          aria-label={`Increase ${item.name}`}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function MealBundleDialog({
  open,
  onOpenChange,
  main,
  sides,
  drinks,
  onConfirm,
}: MealBundleDialogProps) {
  const [mainQty, setMainQty] = useState(1);
  const [mealNote, setMealNote] = useState('');
  const [extraQtys, setExtraQtys] = useState<Record<string, number>>({});

  const uniqueSides = useMemo(() => uniqById(sides), [sides]);
  const uniqueDrinks = useMemo(() => uniqById(drinks), [drinks]);

  useEffect(() => {
    if (!open || !main) return;
    setMainQty(1);
    setMealNote('');
    setExtraQtys({});
  }, [open, main?.id]);

  function setQtyFor(menuItemId: string, qty: number) {
    setExtraQtys((prev) => ({ ...prev, [menuItemId]: qty }));
  }

  function getQty(menuItemId: string) {
    return extraQtys[menuItemId] ?? 0;
  }

  const totalPreview =
    main != null ? main.price * Math.max(1, mainQty) : 0;
  let extrasPreview = 0;
  uniqueSides.forEach((s) => {
    extrasPreview += s.price * getQty(s.id);
  });
  uniqueDrinks.forEach((d) => {
    extrasPreview += d.price * getQty(d.id);
  });

  function handleConfirm() {
    if (!main) return;
    const mq = Math.max(1, Math.floor(mainQty));
    if (!Number.isFinite(mq)) return;
    const extras: Array<{ item: PosMenuItem; quantity: number }> = [];
    uniqueSides.forEach((s) => {
      const q = getQty(s.id);
      if (q > 0) extras.push({ item: s, quantity: q });
    });
    uniqueDrinks.forEach((d) => {
      const q = getQty(d.id);
      if (q > 0) extras.push({ item: d, quantity: q });
    });
    onConfirm({
      mainQuantity: mq,
      mainRemarks: mealNote.trim(),
      extras,
    });
    onOpenChange(false);
  }

  if (!main) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <div className="relative shrink-0 border-b border-border bg-linear-to-r from-accent/55 via-muted/30 to-bbq-teal-light/25 px-5 pt-5 pb-4">
          <DialogHeader className="gap-2 pr-10">
            <DialogTitle className="font-display text-xl font-black tracking-tight">
              Build a meal
            </DialogTitle>
            <DialogDescription className="font-display text-xs leading-relaxed text-muted-foreground">
              Add sides and drinks to send one combined order ticket to kitchen.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <div className="flex gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
              {main.image ? (
                <Image
                  src={main.image}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-2xl">
                  🍖
                </div>
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-between">
              <div>
                <p className="font-display text-sm font-black uppercase leading-tight">
                  Main
                </p>
                <p className="mt-1 line-clamp-2 font-display font-bold leading-snug">
                  {main.name}
                </p>
                <p className="mt-0.5 text-xs tabular-nums text-bbq-flame font-black">
                  RM {main.price.toFixed(2)}{' '}
                  <span className="font-normal text-muted-foreground">
                    ea.
                  </span>
                </p>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  Qty
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="outline"
                    className="h-8 w-8"
                    onClick={() =>
                      setMainQty((q) => Math.max(1, Math.floor(q) - 1))
                    }
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center font-display text-sm font-black tabular-nums">
                    {mainQty}
                  </span>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="outline"
                    className="h-8 w-8"
                    onClick={() => setMainQty((q) => Math.max(1, Math.floor(q) + 1))}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="meal-note" className="font-display text-xs font-bold uppercase tracking-wide">
              Meal note <span className="font-normal">(kitchen — main)</span>
            </Label>
            <Textarea
              id="meal-note"
              value={mealNote}
              onChange={(e) => setMealNote(e.target.value)}
              placeholder="Allergies, no sauce, spicy level…"
              rows={2}
              className="font-display text-sm"
            />
          </div>

          {uniqueSides.length > 0 ? (
            <div className="space-y-2">
              <p className="font-display text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Sides (optional)
              </p>
              <div className="space-y-1.5">
                {uniqueSides.map((s) => (
                  <ExtraQtyRow
                    key={s.id}
                    item={s}
                    quantity={getQty(s.id)}
                    onChange={(q) => setQtyFor(s.id, q)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <p className="font-display text-[11px] text-muted-foreground">
              No side items configured — use Menu → edit to add Sides pillar items.
            </p>
          )}

          {uniqueDrinks.length > 0 ? (
            <div className="space-y-2">
              <p className="font-display text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Drinks (optional)
              </p>
              <div className="space-y-1.5">
                {uniqueDrinks.map((d) => (
                  <ExtraQtyRow
                    key={d.id}
                    item={d}
                    quantity={getQty(d.id)}
                    onChange={(q) => setQtyFor(d.id, q)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <p className="font-display text-[11px] text-muted-foreground">
              No drink items configured — use Menu → edit to add Drinks pillar items.
            </p>
          )}

          <div className="rounded-xl border border-bbq-flame/25 bg-accent/35 px-4 py-3">
            <p className="font-display text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              This meal subtotal preview
            </p>
            <p className="mt-1 font-display text-xl font-black tabular-nums text-bbq-flame">
              RM {(totalPreview + extrasPreview).toFixed(2)}
            </p>
          </div>
        </div>

        <DialogFooter className="mx-0 shrink-0 border-t border-border bg-muted/30 px-5 py-4 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="outline"
            className="font-display md:min-w-32"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="font-display bg-bbq-flame text-white hover:bg-bbq-flame/90 md:min-w-48"
            onClick={handleConfirm}
          >
            Add meal to order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
