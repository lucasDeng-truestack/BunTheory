"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
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
      toast.success("Added to cart", { description: item.name });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92vh,820px)] w-[min(100vw-1.5rem,26rem)] flex-col gap-0 overflow-hidden rounded-3xl border-charcoal/10 p-0 shadow-elevated sm:max-w-md">
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
          <div className="relative aspect-[16/10] w-full shrink-0 bg-gradient-to-b from-charcoal/5 to-charcoal/[0.02]">
            {item.image ? (
              <Image
                src={item.image}
                alt={item.name}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 480px"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center text-6xl text-charcoal/20">
                🍔
              </div>
            )}
          </div>

          <div className="space-y-3 px-5 pb-2 pt-5">
            <DialogHeader className="space-y-2 text-left">
              <DialogTitle className="font-display text-xl leading-tight text-charcoal sm:text-2xl">
                {item.name}
              </DialogTitle>
              {editLineKey ? (
                <p className="text-sm font-medium text-roast-red">
                  Editing your cart
                </p>
              ) : null}
              {item.description ? (
                <DialogDescription className="text-left text-sm leading-relaxed text-charcoal/70">
                  {item.description}
                </DialogDescription>
              ) : null}
            </DialogHeader>

            <div className="inline-flex items-center gap-2 rounded-full border border-charcoal/10 bg-cream/60 px-3 py-1.5 text-sm font-medium text-charcoal shadow-sm">
              <span className="text-charcoal/55">Base</span>
              <span className="font-display font-semibold tabular-nums text-roast-red">
                RM {basePrice.toFixed(2)}
              </span>
            </div>
          </div>

          {item.optionGroups.length > 0 ? (
            <>
              <Separator className="my-1 bg-charcoal/8" />
              <div className="space-y-4 px-5 py-4">
                <div className="flex items-center gap-2 text-charcoal/80">
                  <ListChecks className="h-4 w-4" aria-hidden />
                  <span className="text-xs font-semibold uppercase tracking-wider text-charcoal/50">
                    Customize
                  </span>
                </div>
                {item.optionGroups.map((g) => (
                  <div
                    key={g.id}
                    className="rounded-2xl border border-charcoal/8 bg-white p-4 shadow-sm ring-1 ring-charcoal/[0.04]"
                  >
                    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                      <div>
                        <p className="font-display text-base font-semibold text-charcoal">
                          {g.name}
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {g.required ? (
                            <Badge
                              variant="outline"
                              className="border-roast-red/40 bg-roast-red/5 px-2 py-0 text-[11px] font-semibold uppercase tracking-wide text-roast-red"
                            >
                              Required
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="bg-charcoal/10 px-2 py-0 text-[11px] font-semibold uppercase tracking-wide text-charcoal/70"
                            >
                              Optional
                            </Badge>
                          )}
                          {g.multiSelect ? (
                            <Badge
                              variant="outline"
                              className="border-charcoal/15 px-2 py-0 text-[11px] font-medium text-charcoal/60"
                            >
                              Multi
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-charcoal/15 px-2 py-0 text-[11px] font-medium text-charcoal/60"
                            >
                              Pick one
                            </Badge>
                          )}
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
                              "rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition-all",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-roast-red/35 focus-visible:ring-offset-2",
                              "active:scale-[0.98]",
                              active
                                ? "border-roast-red bg-gradient-to-br from-roast-red/[0.09] to-roast-red/[0.04] text-charcoal shadow-md ring-1 ring-roast-red/25"
                                : "border-charcoal/12 bg-charcoal/[0.02] text-charcoal hover:border-charcoal/25 hover:bg-white hover:shadow-sm"
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

          <Separator className="bg-charcoal/8" />

          <div className="space-y-2 px-5 py-4">
            <Label className="font-display text-base text-charcoal" htmlFor="remarks">
              Remarks
            </Label>
            <Textarea
              id="remarks"
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Allergies, spice level, etc."
              className="resize-none border-charcoal/12 bg-charcoal/[0.02]"
            />
          </div>

          <div className="px-5 pb-5">
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-charcoal/10 bg-gradient-to-r from-cream/40 to-white px-4 py-3.5 shadow-inner">
              <span className="font-display text-sm font-semibold text-charcoal/80">
                Quantity
              </span>
              <div className="flex items-center gap-1 rounded-full border border-charcoal/10 bg-white p-1 shadow-sm">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-10 w-10 rounded-full hover:bg-roast-red/10"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="min-w-[2.25rem] text-center font-display text-lg font-bold tabular-nums text-charcoal">
                  {quantity}
                </span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-10 w-10 rounded-full hover:bg-roast-red/10"
                  onClick={() => setQuantity((q) => q + 1)}
                  aria-label="Increase quantity"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-charcoal/10 bg-gradient-to-b from-white via-cream/30 to-cream/50 px-5 py-4 shadow-[0_-8px_32px_-12px_rgba(0,0,0,0.12)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-charcoal/45">
                Line total
              </p>
              <p className="font-display text-2xl font-bold tabular-nums text-roast-red">
                RM {(unitPrice * quantity).toFixed(2)}
              </p>
            </div>
            <Button
              size="lg"
              className="h-12 min-w-[180px] gap-2 rounded-2xl font-display text-base shadow-md transition hover:shadow-lg"
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
