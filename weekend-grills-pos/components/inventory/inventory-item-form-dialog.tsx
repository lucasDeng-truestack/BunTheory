'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { InventoryItem, InventoryUnit } from '@/types/pos';
import { posInventoryService } from '@/services/pos-inventory.service';

interface InventoryItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialItem: InventoryItem | null;
  onSaved: () => void;
}

const UNIT_OPTIONS: { value: InventoryUnit; label: string }[] = [
  { value: 'KG', label: 'Kilogram (kg)' },
  { value: 'GRAM', label: 'Gram (g)' },
  { value: 'LITER', label: 'Litre (L)' },
  { value: 'ML', label: 'Millilitre (ml)' },
  { value: 'PIECE', label: 'Piece (pc)' },
  { value: 'PACK', label: 'Pack' },
];

export function InventoryItemFormDialog({
  open,
  onOpenChange,
  initialItem,
  onSaved,
}: InventoryItemFormDialogProps) {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState<InventoryUnit>('KG');
  const [lowStockThreshold, setLowStockThreshold] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initialItem) {
      setName(initialItem.name);
      setUnit(initialItem.unit);
      setLowStockThreshold(
        initialItem.lowStockThreshold != null
          ? String(initialItem.lowStockThreshold)
          : '',
      );
    } else {
      setName('');
      setUnit('KG');
      setLowStockThreshold('');
    }
  }, [open, initialItem]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Enter an item name.');
      return;
    }
    setSaving(true);
    try {
      const threshold = parseFloat(lowStockThreshold);
      const payload = {
        name: name.trim(),
        unit,
        lowStockThreshold:
          !Number.isNaN(threshold) && threshold >= 0 ? threshold : undefined,
      };
      if (initialItem) {
        await posInventoryService.updateItem(initialItem.id, payload);
        toast.success('Inventory item updated');
      } else {
        await posInventoryService.createItem(payload);
        toast.success('Inventory item added');
      }
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error('Could not save inventory item');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="font-display">
              {initialItem ? 'Edit ingredient' : 'Add ingredient'}
            </DialogTitle>
            <DialogDescription>
              Track stock levels and get low-stock alerts.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="inv-name" className="font-display">
                Name
              </Label>
              <Input
                id="inv-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="font-display"
                placeholder="e.g. Chicken Wings (raw)"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label className="font-display">Unit</Label>
              <Select
                value={unit}
                onValueChange={(v) => setUnit(v as InventoryUnit)}
              >
                <SelectTrigger className="w-full font-display">
                  <span className="flex flex-1 text-left">
                    {UNIT_OPTIONS.find((o) => o.value === unit)?.label ?? 'Select unit'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS.map((o) => (
                    <SelectItem
                      key={o.value}
                      value={o.value}
                      className="font-display"
                    >
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="inv-threshold" className="font-display">
                Low stock threshold
              </Label>
              <Input
                id="inv-threshold"
                type="number"
                min={0}
                step={0.1}
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
                placeholder="Optional"
              />
              <p className="text-[11px] text-muted-foreground">
                Alert when stock drops below this amount.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="font-display"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="font-display bg-bbq-flame text-white hover:bg-bbq-flame/90"
              disabled={saving}
            >
              {saving
                ? 'Saving…'
                : initialItem
                  ? 'Save changes'
                  : 'Create item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
