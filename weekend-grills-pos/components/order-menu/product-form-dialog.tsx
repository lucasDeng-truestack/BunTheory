'use client';

import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PosProduct, PosProductType, POS_PRODUCT_TYPE_OPTIONS, formatPosProductType } from '@/types/pos';
import { posMenuService } from '@/services/pos-menu.service';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProductImageField } from './product-image-field';

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionId: string;
  initialProduct: PosProduct | null;
  onSaved: () => void;
}

type VariantRow = { name: string; price: string };
type OptionRow = { label: string; priceDelta: string };
type SlotRow = { label: string; required: boolean; options: OptionRow[] };

function RemoveRowButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={disabled}
      onClick={onClick}
      className="h-9 w-9 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
      aria-label={label}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}

export function ProductFormDialog({
  open,
  onOpenChange,
  sectionId,
  initialProduct,
  onSaved,
}: ProductFormDialogProps) {
  const isEdit = Boolean(initialProduct);
  const [type, setType] = useState<PosProductType>('SIMPLE');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState('0');
  const [available, setAvailable] = useState(true);
  const [includesText, setIncludesText] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [variants, setVariants] = useState<VariantRow[]>([{ name: '', price: '0' }]);
  const [comboSlots, setComboSlots] = useState<SlotRow[]>([
    { label: 'Choice', required: true, options: [{ label: '', priceDelta: '0' }] },
  ]);
  const [optionSlots, setOptionSlots] = useState<SlotRow[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initialProduct) {
      setType(initialProduct.type);
      setName(initialProduct.name);
      setDescription(initialProduct.description ?? '');
      setBasePrice(String(initialProduct.basePrice));
      setAvailable(initialProduct.available);
      setImage(initialProduct.image);
      setIncludesText(initialProduct.combo?.includesText ?? '');
      setVariants(
        initialProduct.variants.length
          ? initialProduct.variants.map((v) => ({
              name: v.name,
              price: String(v.price),
            }))
          : [{ name: '', price: '0' }],
      );
      setComboSlots(
        initialProduct.combo?.slots.length
          ? initialProduct.combo.slots.map((s) => ({
              label: s.label,
              required: s.required,
              options: s.options.map((o) => ({
                label: o.label,
                priceDelta: String(o.priceDelta),
              })),
            }))
          : [{ label: 'Choice', required: true, options: [{ label: '', priceDelta: '0' }] }],
      );
      setOptionSlots(
        initialProduct.optionSlots?.length
          ? initialProduct.optionSlots.map((s) => ({
              label: s.label,
              required: s.required,
              options: s.options.map((o) => ({
                label: o.label,
                priceDelta: String(o.priceDelta),
              })),
            }))
          : [],
      );
    } else {
      setType('SIMPLE');
      setName('');
      setDescription('');
      setBasePrice('0');
      setAvailable(true);
      setImage(null);
      setIncludesText('');
      setVariants([{ name: '', price: '0' }]);
      setComboSlots([{ label: 'Choice', required: true, options: [{ label: '', priceDelta: '0' }] }]);
      setOptionSlots([]);
    }
  }, [open, initialProduct]);

  async function handleSave() {
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        sectionId,
        type,
        name: name.trim(),
        description: description.trim() || undefined,
        image: image || null,
        basePrice: Number(basePrice),
        available,
      };

      if (type === 'COMBO') {
        payload.includesText = includesText.trim() || undefined;
        payload.slots = comboSlots.map((slot, si) => ({
          label: slot.label.trim(),
          sortOrder: si,
          required: slot.required,
          options: slot.options.map((opt, oi) => ({
            label: opt.label.trim(),
            priceDelta: Number(opt.priceDelta) || 0,
            sortOrder: oi,
          })),
        }));
      }

      if (type === 'SIMPLE' || type === 'VARIANT') {
        payload.optionSlots = optionSlots
          .filter((slot) => slot.label.trim() && slot.options.some((o) => o.label.trim()))
          .map((slot, si) => ({
            label: slot.label.trim(),
            sortOrder: si,
            required: slot.required,
            options: slot.options
              .filter((opt) => opt.label.trim())
              .map((opt, oi) => ({
                label: opt.label.trim(),
                priceDelta: Number(opt.priceDelta) || 0,
                sortOrder: oi,
              })),
          }));
      }

      if (type === 'VARIANT') {
        payload.variants = variants.map((v, vi) => ({
          name: v.name.trim(),
          price: Number(v.price),
          sortOrder: vi,
        }));
      }

      if (isEdit && initialProduct) {
        await posMenuService.updateProduct(initialProduct.id, payload);
        toast.success('Product updated');
      } else {
        await posMenuService.createProduct(payload);
        toast.success('Product created');
      }
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save product');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display">
            {isEdit ? 'Edit product' : 'Add product'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!isEdit ? (
            <div>
              <Label className="font-display text-xs">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as PosProductType)}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue placeholder="Select type">
                    {formatPosProductType(type)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {POS_PRODUCT_TYPE_OPTIONS.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div>
            <Label className="font-display text-xs">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
          </div>

          <div>
            <Label className="font-display text-xs">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-1 resize-none"
            />
          </div>

          <ProductImageField value={image} onChange={setImage} />

          {type !== 'VARIANT' ? (
            <div>
              <Label className="font-display text-xs">Base price (RM)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                className="mt-1"
              />
            </div>
          ) : null}

          <div className="flex items-center justify-between rounded-lg border px-3 py-2">
            <Label className="font-display text-xs">Available on menu</Label>
            <input
              type="checkbox"
              checked={available}
              onChange={(e) => setAvailable(e.target.checked)}
              className="h-4 w-4 accent-bbq-flame"
            />
          </div>

          {type === 'COMBO' ? (
            <>
              <div>
                <Label className="font-display text-xs">Includes text (fixed items)</Label>
                <Input
                  value={includesText}
                  onChange={(e) => setIncludesText(e.target.value)}
                  placeholder="Includes: Loaded Fries, Corn, Slaw"
                  className="mt-1"
                />
              </div>
              <div className="space-y-3">
                <Label className="font-display text-xs">Combo slots</Label>
                {comboSlots.map((slot, si) => (
                  <div key={si} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={slot.label}
                        onChange={(e) => {
                          const next = [...comboSlots];
                          next[si] = { ...slot, label: e.target.value };
                          setComboSlots(next);
                        }}
                        placeholder="Slot label (e.g. Protein)"
                        className="flex-1"
                      />
                      <RemoveRowButton
                        label="Remove combo slot"
                        disabled={comboSlots.length <= 1}
                        onClick={() => setComboSlots(comboSlots.filter((_, i) => i !== si))}
                      />
                    </div>
                    {slot.options.map((opt, oi) => (
                      <div key={oi} className="flex gap-2">
                        <Input
                          value={opt.label}
                          onChange={(e) => {
                            const next = [...comboSlots];
                            const opts = [...slot.options];
                            opts[oi] = { ...opt, label: e.target.value };
                            next[si] = { ...slot, options: opts };
                            setComboSlots(next);
                          }}
                          placeholder="Option label"
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={opt.priceDelta}
                          onChange={(e) => {
                            const next = [...comboSlots];
                            const opts = [...slot.options];
                            opts[oi] = { ...opt, priceDelta: e.target.value };
                            next[si] = { ...slot, options: opts };
                            setComboSlots(next);
                          }}
                          placeholder="+RM"
                          className="w-24"
                        />
                        <RemoveRowButton
                          label="Remove option"
                          disabled={slot.options.length <= 1}
                          onClick={() => {
                            const next = [...comboSlots];
                            next[si] = {
                              ...slot,
                              options: slot.options.filter((_, i) => i !== oi),
                            };
                            setComboSlots(next);
                          }}
                        />
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="font-display text-xs"
                      onClick={() => {
                        const next = [...comboSlots];
                        next[si] = {
                          ...slot,
                          options: [...slot.options, { label: '', priceDelta: '0' }],
                        };
                        setComboSlots(next);
                      }}
                    >
                      Add option
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="font-display text-xs"
                  onClick={() =>
                    setComboSlots([
                      ...comboSlots,
                      {
                        label: '',
                        required: true,
                        options: [{ label: '', priceDelta: '0' }],
                      },
                    ])
                  }
                >
                  Add slot
                </Button>
              </div>
            </>
          ) : null}

          {type === 'VARIANT' ? (
            <div className="space-y-2">
              <Label className="font-display text-xs">Variants</Label>
              {variants.map((v, vi) => (
                <div key={vi} className="flex gap-2">
                  <Input
                    value={v.name}
                    onChange={(e) => {
                      const next = [...variants];
                      next[vi] = { ...v, name: e.target.value };
                      setVariants(next);
                    }}
                    placeholder="e.g. 6 pcs"
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={v.price}
                    onChange={(e) => {
                      const next = [...variants];
                      next[vi] = { ...v, price: e.target.value };
                      setVariants(next);
                    }}
                    className="w-28"
                  />
                  <RemoveRowButton
                    label="Remove variant"
                    disabled={variants.length <= 1}
                    onClick={() => setVariants(variants.filter((_, i) => i !== vi))}
                  />
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="font-display text-xs"
                onClick={() => setVariants([...variants, { name: '', price: '0' }])}
              >
                Add variant
              </Button>
            </div>
          ) : null}

          {type === 'SIMPLE' || type === 'VARIANT' ? (
            <div className="space-y-3">
              <div>
                <Label className="font-display text-xs">Option slots (optional)</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Let staff pick choices like Spicy or Non-spicy when ordering.
                </p>
              </div>
              {optionSlots.map((slot, si) => (
                <div key={si} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      value={slot.label}
                      onChange={(e) => {
                        const next = [...optionSlots];
                        next[si] = { ...slot, label: e.target.value };
                        setOptionSlots(next);
                      }}
                      placeholder="Slot label (e.g. Spice level)"
                      className="flex-1"
                    />
                    <RemoveRowButton
                      label="Remove option slot"
                      onClick={() => setOptionSlots(optionSlots.filter((_, i) => i !== si))}
                    />
                  </div>
                  {slot.options.map((opt, oi) => (
                    <div key={oi} className="flex gap-2">
                      <Input
                        value={opt.label}
                        onChange={(e) => {
                          const next = [...optionSlots];
                          const opts = [...slot.options];
                          opts[oi] = { ...opt, label: e.target.value };
                          next[si] = { ...slot, options: opts };
                          setOptionSlots(next);
                        }}
                        placeholder="Option label"
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={opt.priceDelta}
                        onChange={(e) => {
                          const next = [...optionSlots];
                          const opts = [...slot.options];
                          opts[oi] = { ...opt, priceDelta: e.target.value };
                          next[si] = { ...slot, options: opts };
                          setOptionSlots(next);
                        }}
                        placeholder="+RM"
                        className="w-24"
                      />
                      <RemoveRowButton
                        label="Remove option"
                        disabled={slot.options.length <= 1}
                        onClick={() => {
                          const next = [...optionSlots];
                          next[si] = {
                            ...slot,
                            options: slot.options.filter((_, i) => i !== oi),
                          };
                          setOptionSlots(next);
                        }}
                      />
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="font-display text-xs"
                    onClick={() => {
                      const next = [...optionSlots];
                      next[si] = {
                        ...slot,
                        options: [...slot.options, { label: '', priceDelta: '0' }],
                      };
                      setOptionSlots(next);
                    }}
                  >
                    Add option
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="font-display text-xs"
                onClick={() =>
                  setOptionSlots([
                    ...optionSlots,
                    {
                      label: '',
                      required: true,
                      options: [{ label: '', priceDelta: '0' }],
                    },
                  ])
                }
              >
                Add slot
              </Button>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-bbq-flame font-display font-bold text-white hover:bg-bbq-flame/90"
          >
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create product'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
