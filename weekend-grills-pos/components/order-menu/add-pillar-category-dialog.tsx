'use client';

import { FormEvent, useEffect, useState } from 'react';
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
import { posMenuService } from '@/services/pos-menu.service';
import type { PosCategory } from '@/types/pos';

interface AddPillarCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: PosCategory[];
  onCreated: (category: PosCategory) => void | Promise<void>;
}

export function AddPillarCategoryDialog({
  open,
  onOpenChange,
  categories,
  onCreated,
}: AddPillarCategoryDialogProps) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setName('');
  }, [open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const t = name.trim();
    if (!t) {
      toast.error('Enter a pillar name (e.g. Mains, Sides, Drinks).');
      return;
    }
    const sortOrder =
      categories.length === 0
        ? 0
        : Math.max(...categories.map((c) => c.sortOrder)) + 1;

    setSaving(true);
    try {
      const created = await posMenuService.createCategory({
        name: t,
        sortOrder,
      });
      toast.success(`Added pillar “${created.name}”`);
      setName('');
      await onCreated(created);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add pillar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="border-l-[5px] border-l-bbq-flame sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-black">
              Add pillar category
            </DialogTitle>
            <DialogDescription className="text-[13px] leading-relaxed">
              Pillars group the menu (e.g. <strong className="font-semibold">Mains</strong>,{' '}
              <strong className="font-semibold">Sides</strong>,{' '}
              <strong className="font-semibold">Drinks</strong>). Item type for kitchen still
              follows the name: use “Side” or “Drink” in the label so meals route correctly.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-4">
            <Label htmlFor="pillar-name" className="font-display font-bold">
              Pillar name
            </Label>
            <Input
              id="pillar-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mains"
              className="font-display"
              autoComplete="off"
              disabled={saving}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="font-display"
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="font-display bg-bbq-flame text-white hover:bg-bbq-flame/90"
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save pillar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
