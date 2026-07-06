"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useFlyToCart } from "@/components/menu/fly-to-cart";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useCartStore, type CartSelection } from "@/store/cart.store";
import type { MenuItem } from "@/types/menu";
import { normalizeMenuSlug } from "@/lib/menu-slug";
import { resolveItemImage } from "@/lib/storefront-display";
import { cn } from "@/lib/utils";
import { Minus, Plus, ShoppingCart, ListChecks, Pencil } from "lucide-react";

function computeUnitPrice(
  item: MenuItem,
  selections: Record<string, string[]>
): number {
  let p = typeof item.price === "string" ? parseFloat(item.price) : item.price;
  for (const g of item.optionGroups) {
    const ids = selections[g.id] ?? [];
    for (const oid of ids) {
      const opt = g.options.find((o) => o.id === oid);
      if (opt) {
        const d =
          typeof opt.priceDelta === "string"
            ? parseFloat(opt.priceDelta)
            : opt.priceDelta;
        p += d;
      }
    }
  }
  return p;
}

type MenuItemModalProps = {
  item: MenuItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, save updates this cart line instead of adding a new one. */
  editLineKey?: string | null;
};

export function MenuItemModal({
  item,
  open,
  onOpenChange,
  editLineKey = null,
}: MenuItemModalProps) {
  const addItem = useCartStore((s) => s.addItem);
  const replaceItem = useCartStore((s) => s.replaceItem);
  const { fly } = useFlyToCart();
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const [quantity, setQuantity] = useState(1);
  const [remarks, setRemarks] = useState("");
  const [selections, setSelections] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!item || !open) return;
    if (editLineKey) {
      const line = useCartStore
        .getState()
        .items.find((i) => i.lineKey === editLineKey);
      if (!line) {
        onOpenChange(false);
        return;
      }
      setQuantity(line.quantity);
      setRemarks(line.remarks ?? "");
      const init: Record<string, string[]> = {};
      for (const g of item.optionGroups) {
        init[g.id] = [];
      }
      for (const sel of line.selections ?? []) {
        init[sel.groupId] = [...sel.optionIds];
      }
      setSelections(init);
    } else {
      setQuantity(1);
      setRemarks("");
      const init: Record<string, string[]> = {};
      for (const g of item.optionGroups) {
        init[g.id] = [];
      }
      setSelections(init);
    }
  }, [item, open, editLineKey, onOpenChange]);

  const unitPrice = useMemo(
    () => (item ? computeUnitPrice(item, selections) : 0),
    [item, selections]
  );

  if (!item) return null;

  const basePrice =
    typeof item.price === "string" ? parseFloat(item.price) : item.price;

  const toggleMulti = (groupId: string, optionId: string, multi: boolean) => {
    setSelections((prev) => {
      const cur = prev[groupId] ?? [];
      if (multi) {
        const next = cur.includes(optionId)
          ? cur.filter((id) => id !== optionId)
          : [...cur, optionId];
        return { ...prev, [groupId]: next };
      }
      return { ...prev, [groupId]: cur.includes(optionId) ? [] : [optionId] };
    });
  };

  const validate = (): boolean => {
    for (const g of item.optionGroups) {
      if (!g.required) continue;
      const picked = selections[g.id] ?? [];
      if (picked.length === 0) {
        toast.error("Selection required", { description: `Choose: ${g.name}` });
        return false;
      }
    }
    return true;
  };

  const handleAdd = () => {
    if (!validate()) return;
    const slug = normalizeMenuSlug(item.slug);
    if (!slug) {
      toast.error("Invalid item");
      return;
    }
    const sel: CartSelection[] = [];
    for (const g of item.optionGroups) {
      const ids = selections[g.id] ?? [];
      if (ids.length) sel.push({ groupId: g.id, optionIds: ids });
    }
    const payload = {
      slug,
      menuId: item.id,
      name: item.name,
      unitPrice,
      image: item.image,
      remarks: remarks.trim() || undefined,
      selections: sel.length ? sel : undefined,
    };
    if (editLineKey) {
      replaceItem(editLineKey, payload, quantity);
      toast.success("Cart updated", { description: item.name });
    } else {
      addItem(payload, quantity);
      const rect = addBtnRef.current?.getBoundingClientRect();
      if (rect) fly({ src: item.image, from: rect });
      toast.success("Added to cart", { description: item.name });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92vh,820px)] w-[min(calc(100%-1.5rem),26rem)] flex-col gap-0 overflow-hidden rounded-5xl border-2 border-bun-ink p-0 shadow-sticker-lg sm:max-w-md">
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
          <div className="relative aspect-[16/10] w-full shrink-0 bg-item-photo">
            <Image
              src={resolveItemImage(item)}
              alt={item.name}
              fill
              className={item.image?.trim() ? "object-cover" : "object-contain p-6"}
              sizes="(max-width: 640px) 100vw, 480px"
              priority
            />
            <Badge variant="sticker" className="absolute left-4 top-4 rotate-[-6deg] text-base">
              RM {basePrice.toFixed(2)}
            </Badge>
          </div>

          <div className="space-y-3 px-5 pb-2 pt-5">
            <DialogHeader className="space-y-2 text-left">
              <DialogTitle className="font-display text-2xl font-bold leading-tight text-bun-ink">
                {item.name}
              </DialogTitle>
              {editLineKey ? (
                <p className="font-display text-sm font-semibold text-bun-red">
                  Editing your cart
                </p>
              ) : null}
              {item.description ? (
                <DialogDescription className="text-left text-sm leading-relaxed text-bun-ink-soft">
                  {item.description}
                </DialogDescription>
              ) : null}
            </DialogHeader>
          </div>

          {item.optionGroups.length > 0 ? (
            <>
              <Separator className="my-2 bg-bun-ink/10" />
              <div className="space-y-4 px-5 py-4">
                <div className="flex items-center gap-2 text-bun-ink">
                  <ListChecks className="h-4 w-4" aria-hidden />
                  <span className="font-display text-xs font-semibold uppercase tracking-[0.14em] text-bun-ink-soft">
                    Customise
                  </span>
                </div>
                {item.optionGroups.map((g) => (
                  <div
                    key={g.id}
                    className="rounded-2xl border-2 border-bun-ink/12 bg-bun-cream-soft p-4"
                  >
                    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                      <div>
                        <p className="font-display text-base font-bold text-bun-ink">
                          {g.name}
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {g.required ? (
                            <Badge className="bg-bun-red px-2 py-0 text-[11px] uppercase tracking-wide">
                              Required
                            </Badge>
                          ) : (
                            <Badge variant="dark" className="px-2 py-0 text-[11px] uppercase tracking-wide">
                              Optional
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className="border-bun-ink/20 px-2 py-0 text-[11px] font-medium text-bun-ink-soft"
                          >
                            {g.multiSelect ? "Multi" : "Pick one"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {g.options.map((o) => {
                        const picked = selections[g.id] ?? [];
                        const active = picked.includes(o.id);
                        const pd =
                          typeof o.priceDelta === "string"
                            ? parseFloat(o.priceDelta)
                            : o.priceDelta;
                        const label =
                          pd > 0
                            ? `${o.label} · +RM${pd.toFixed(2)}`
                            : o.label;
                        return (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() => toggleMulti(g.id, o.id, g.multiSelect)}
                            className={cn(
                              "rounded-xl border-2 px-4 py-3 text-left font-display text-sm font-semibold transition-all",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bun-red/40 focus-visible:ring-offset-2",
                              "active:scale-[0.98]",
                              active
                                ? "border-bun-ink bg-bun-yellow text-bun-ink shadow-sticker"
                                : "border-bun-ink/15 bg-white text-bun-ink hover:border-bun-ink/40"
                            )}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          <Separator className="bg-bun-ink/10" />

          <div className="space-y-2 px-5 py-4">
            <Label className="font-display text-base font-semibold text-bun-ink" htmlFor="remarks">
              Remarks
            </Label>
            <Textarea
              id="remarks"
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Allergies, spice level, etc."
              className="resize-none border-2 border-bun-ink/15 bg-bun-cream-soft"
            />
          </div>

          <div className="px-5 pb-5">
            <div className="flex items-center justify-between gap-4 rounded-2xl border-2 border-bun-ink bg-white px-4 py-3.5 shadow-sticker">
              <span className="font-display text-sm font-bold text-bun-ink">
                Quantity
              </span>
              <div className="flex items-center gap-1 rounded-full border-2 border-bun-ink bg-bun-cream-soft p-1">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-10 w-10 rounded-full hover:bg-bun-yellow"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-4 w-4" strokeWidth={3} />
                </Button>
                <span className="min-w-[2.25rem] text-center font-display text-lg font-bold tabular-nums text-bun-ink">
                  {quantity}
                </span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-10 w-10 rounded-full hover:bg-bun-yellow"
                  onClick={() => setQuantity((q) => q + 1)}
                  aria-label="Increase quantity"
                >
                  <Plus className="h-4 w-4" strokeWidth={3} />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t-2 border-bun-ink bg-bun-cream-soft px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div>
              <p className="font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-bun-ink-soft">
                Line total
              </p>
              <p className="font-display text-2xl font-bold tabular-nums text-bun-red">
                RM {(unitPrice * quantity).toFixed(2)}
              </p>
            </div>
            <Button
              ref={addBtnRef}
              size="lg"
              variant="hero"
              className="min-w-[180px] gap-2"
              onClick={handleAdd}
            >
              {editLineKey ? (
                <Pencil className="h-5 w-5" />
              ) : (
                <ShoppingCart className="h-5 w-5" />
              )}
              {editLineKey ? "Update cart" : "Add to cart"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
