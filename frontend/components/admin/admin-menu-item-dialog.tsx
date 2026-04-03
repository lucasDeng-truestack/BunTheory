"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createMenuItem, updateMenuItem } from "@/services/menu.service";
import { uploadImage } from "@/services/upload.service";
import type { MenuItem } from "@/types/menu";
import {
  GripVertical,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  sanitizeIntegerInput,
  sanitizeMoneyInput,
} from "@/lib/sanitize-input";

type OptionRow = { label: string; priceDelta: string };
type GroupRow = {
  id: string;
  name: string;
  required: boolean;
  multiSelect: boolean;
  options: OptionRow[];
};

function emptyGroup(): GroupRow {
  return {
    id: crypto.randomUUID(),
    name: "",
    required: false,
    multiSelect: false,
    options: [{ label: "", priceDelta: "0" }],
  };
}

type AdminMenuItemDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  /** null = create */
  item: MenuItem | null;
  onSaved: () => void;
};

export function AdminMenuItemDialog({
  open,
  onOpenChange,
  token,
  item,
  onSaved,
}: AdminMenuItemDialogProps) {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [maxQty, setMaxQty] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [available, setAvailable] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [groups, setGroups] = useState<GroupRow[]>([]);

  useEffect(() => {
    if (!open) return;
    if (!item) {
      setName("");
      setDescription("");
      setPrice("");
      setMaxQty("");
      setIsFavorite(false);
      setAvailable(true);
      setImageUrl(null);
      setGroups([]);
      return;
    }
    setName(item.name);
    setDescription(item.description ?? "");
    setPrice(String(item.price));
    setMaxQty(item.maxQuantity != null ? String(item.maxQuantity) : "");
    setIsFavorite(item.isFavorite);
    setAvailable(item.available);
    setImageUrl(item.image);
    setGroups(
      item.optionGroups.length
        ? item.optionGroups.map((g) => ({
            id: g.id,
            name: g.name,
            required: g.required,
            multiSelect: g.multiSelect,
            options:
              g.options.length > 0
                ? g.options.map((o) => ({
                    label: o.label,
                    priceDelta: String(o.priceDelta),
                  }))
                : [{ label: "", priceDelta: "0" }],
          }))
        : []
    );
  }, [open, item]);

  const buildPayload = () => {
    const optionGroups = groups
      .map((g) => ({
        name: g.name.trim(),
        required: g.required,
        multiSelect: g.multiSelect,
        options: g.options
          .filter((o) => o.label.trim())
          .map((o) => ({
            label: o.label.trim(),
            priceDelta: parseFloat(o.priceDelta) || 0,
          })),
      }))
      .filter((g) => g.name && g.options.length > 0);

    const maxQ = maxQty.trim();
    const payload: Record<string, unknown> = {
      name: name.trim(),
      description: description.trim() || undefined,
      price: parseFloat(price) || 0,
      isFavorite,
      available,
      image: imageUrl || undefined,
      optionGroups,
    };
    if (maxQ === "") {
      if (item) payload.maxQuantity = null;
    } else {
      payload.maxQuantity = parseInt(maxQ, 10);
    }
    return payload;
  };

  const handleSave = async () => {
    if (!name.trim() || !price) return;
    setSaving(true);
    try {
      const payload = buildPayload();
      if (item) {
        await updateMenuItem(token, item.id, payload);
      } else {
        await createMenuItem(token, payload);
      }
      onSaved();
      onOpenChange(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleImage = async (file: File) => {
    setUploading(true);
    try {
      const { url } = await uploadImage(file, token);
      setImageUrl(url);
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-full overflow-y-auto rounded-3xl border-charcoal/10 p-0 shadow-elevated sm:max-w-2xl md:max-w-3xl lg:max-w-4xl">
        <div className="border-b border-charcoal/8 bg-gradient-to-br from-cream/40 via-white to-white px-5 pb-5 pt-6 sm:px-8 md:px-10">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="font-display text-xl sm:text-2xl">
              {item ? "Edit item" : "Add item"}
            </DialogTitle>
            <DialogDescription className="text-sm text-charcoal/60">
              Details show on the live menu. Option groups power add-ons and variants
              on checkout.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-5 px-5 py-5 sm:px-8 md:space-y-6 md:px-10 md:py-6">
          <div className="space-y-2">
            <Label className="font-display text-charcoal">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 rounded-xl border-charcoal/12 shadow-sm"
			  placeholder="e.g. Chicken Burger"
            />
          </div>
          <div className="space-y-2">
            <Label className="font-display text-charcoal">Price (RM)</Label>
            <Input
              type="text"
              inputMode="decimal"
              pattern="[0-9.]*"
              placeholder="e.g. 12.90"
              value={price}
              onChange={(e) => setPrice(sanitizeMoneyInput(e.target.value, 2))}
              className="h-11 rounded-xl border-charcoal/12 shadow-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="font-display text-charcoal">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What makes this item special…"
              className="border-charcoal/12 bg-charcoal/[0.02]"
            />
          </div>
          <div className="space-y-2">
            <Label className="font-display text-charcoal">
              Max item quantity <span className="font-normal text-charcoal/50">(optional)</span>
            </Label>
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={maxQty}
              onChange={(e) =>
                setMaxQty(sanitizeIntegerInput(e.target.value))
              }
              placeholder="Unlimited if empty"
              className="h-11 rounded-xl border-charcoal/12 shadow-sm"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={isFavorite ? "default" : "outline"}
              className={cn(
                "rounded-full font-display",
                isFavorite && "shadow-sm"
              )}
              onClick={() => setIsFavorite((f) => !f)}
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Favorite
            </Button>
            <Button
              type="button"
              size="sm"
              variant={available ? "outline" : "secondary"}
              className="rounded-full font-display"
              onClick={() => setAvailable((a) => !a)}
            >
              {available ? "Available" : "Hidden"}
            </Button>
          </div>

          <div className="space-y-2">
            <Label className="font-display text-charcoal">Image</Label>
            <div className="flex items-center gap-4 rounded-2xl border border-dashed border-charcoal/15 bg-charcoal/[0.02] p-4 md:gap-6 md:p-5">
              {imageUrl ? (
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-charcoal/5 shadow-inner ring-1 ring-charcoal/10 md:h-32 md:w-32">
                  <Image src={imageUrl} alt="" fill className="object-cover" />
                </div>
              ) : (
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-charcoal/5 text-3xl text-charcoal/25 md:h-32 md:w-32 md:text-4xl">
                  🍔
                </div>
              )}
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleImage(f);
                    e.target.value = "";
                  }}
                />
                <Button type="button" variant="outline" size="sm" asChild>
                  <span className="inline-flex items-center gap-2 rounded-xl font-display">
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    Upload photo
                  </span>
                </Button>
              </label>
            </div>
          </div>

          <Separator className="my-2 bg-charcoal/8" />

          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-semibold text-charcoal">
                  Option groups
                </h3>
                <p className="mt-0.5 max-w-md text-sm text-charcoal/55 md:max-w-xl">
                  e.g. drinks, size, add-ons. Customers pick these on the item modal.
                </p>
              </div>
              <Button
                type="button"
                variant="default"
                size="sm"
                className="shrink-0 rounded-full font-display shadow-sm"
                onClick={() => setGroups((g) => [...g, emptyGroup()])}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Add group
              </Button>
            </div>

            {groups.length === 0 ? (
              <button
                type="button"
                onClick={() => setGroups([emptyGroup()])}
                className="w-full rounded-2xl border-2 border-dashed border-charcoal/15 bg-gradient-to-b from-charcoal/[0.02] to-transparent px-6 py-10 text-center transition hover:border-roast-red/35 hover:bg-roast-red/[0.03]"
              >
                <p className="font-display text-sm font-semibold text-charcoal/70">
                  No option groups yet
                </p>
                <p className="mt-1 text-sm text-charcoal/45">
                  Tap to add your first group (drinks, sides, spice level…)
                </p>
              </button>
            ) : (
              <div className="space-y-4">
                {groups.map((g, gi) => (
                  <Card
                    key={g.id}
                    className="overflow-hidden border-charcoal/10 shadow-md ring-1 ring-charcoal/[0.06]"
                  >
                    <CardHeader className="space-y-4 border-b border-charcoal/8 bg-gradient-to-r from-cream/30 to-white pb-5 pt-4">
                      <div className="flex items-start gap-2">
                        <GripVertical
                          className="mt-2 h-5 w-5 shrink-0 text-charcoal/25"
                          aria-hidden
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                          <CardTitle className="font-display text-base text-charcoal">
                            Group {gi + 1}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Name the group, then list choices and extra price.
                          </CardDescription>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-charcoal/40 hover:bg-red-50 hover:text-red-600"
                          onClick={() =>
                            setGroups((prev) => prev.filter((_, i) => i !== gi))
                          }
                          aria-label="Remove group"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-6">
                        <Input
                          placeholder="Group name (e.g. Drinks, Size)"
                          value={g.name}
                          onChange={(e) => {
                            const v = e.target.value;
                            setGroups((prev) =>
                              prev.map((x, i) =>
                                i === gi ? { ...x, name: v } : x
                              )
                            );
                          }}
                          className="h-11 rounded-xl border-charcoal/12 font-display shadow-sm"
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={g.required ? "default" : "outline"}
                            className={cn(
                              "rounded-full font-display text-xs",
                              g.required && "shadow-sm"
                            )}
                            onClick={() => {
                              const v = !g.required;
                              setGroups((prev) =>
                                prev.map((x, i) =>
                                  i === gi ? { ...x, required: v } : x
                                )
                              );
                            }}
                          >
                            Required
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={g.multiSelect ? "default" : "outline"}
                            className={cn(
                              "rounded-full font-display text-xs",
                              g.multiSelect && "shadow-sm"
                            )}
                            onClick={() => {
                              const v = !g.multiSelect;
                              setGroups((prev) =>
                                prev.map((x, i) =>
                                  i === gi ? { ...x, multiSelect: v } : x
                                )
                              );
                            }}
                          >
                            Multi-select
                          </Button>
                          {g.required ? (
                            <Badge
                              variant="outline"
                              className="border-roast-red/30 text-[10px] text-roast-red"
                            >
                              Customer must pick
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 pt-4">
                      {g.options.map((o, oi) => (
                        <div
                          key={`${g.id}-${oi}`}
                          className="flex flex-col gap-2 rounded-xl border border-charcoal/8 bg-charcoal/[0.03] p-2 pl-3 sm:flex-row sm:items-center sm:gap-3 md:p-3"
                        >
                          <Input
                            placeholder="Option label"
                            value={o.label}
                            onChange={(e) => {
                              const v = e.target.value;
                              setGroups((prev) =>
                                prev.map((gr, i) =>
                                  i === gi
                                    ? {
                                        ...gr,
                                        options: gr.options.map((op, j) =>
                                          j === oi ? { ...op, label: v } : op
                                        ),
                                      }
                                    : gr
                                )
                              );
                            }}
                            className="h-10 min-h-10 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 md:min-w-0"
                          />
                          <div className="flex shrink-0 items-center justify-end gap-1 self-end rounded-lg bg-white px-2 py-0.5 shadow-sm ring-1 ring-charcoal/10 sm:self-center sm:py-1">
                            <span className="text-xs font-medium text-charcoal/45">
                              +RM
                            </span>
                            <Input
                              type="text"
                              inputMode="decimal"
                              pattern="[0-9.]*"
                              className="h-9 w-24 border-0 bg-transparent p-0 text-right font-medium tabular-nums shadow-none focus-visible:ring-0 md:w-28"
                              placeholder="0"
                              value={o.priceDelta}
                              onChange={(e) => {
                                const v = sanitizeMoneyInput(e.target.value, 2);
                                setGroups((prev) =>
                                  prev.map((gr, i) =>
                                    i === gi
                                      ? {
                                          ...gr,
                                          options: gr.options.map((op, j) =>
                                            j === oi ? { ...op, priceDelta: v } : op
                                          ),
                                        }
                                      : gr
                                  )
                                );
                              }}
                            />
                          </div>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="mt-1 w-full rounded-xl border border-dashed border-charcoal/15 font-display text-charcoal/70 hover:bg-charcoal/[0.04]"
                        onClick={() =>
                          setGroups((prev) =>
                            prev.map((gr, i) =>
                              i === gi
                                ? {
                                    ...gr,
                                    options: [
                                      ...gr.options,
                                      { label: "", priceDelta: "0" },
                                    ],
                                  }
                                : gr
                            )
                          )
                        }
                      >
                        <Plus className="mr-1.5 h-4 w-4" />
                        Add option
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <Separator className="bg-charcoal/8" />

          <div className="flex justify-end gap-2 pb-1 pt-1">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl font-display"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="min-w-[100px] rounded-xl font-display shadow-md"
              disabled={saving || !name.trim()}
              onClick={() => void handleSave()}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
