'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { PosShell } from '@/components/layout/pos-shell';
import { posPurchasesService } from '@/services/pos-purchases.service';
import { PosPurchase } from '@/types/pos';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<PosPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [remark, setRemark] = useState('');
  const [amount, setAmount] = useState('');
  const [purchasedAt, setPurchasedAt] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const rows = await posPurchasesService.list();
      setPurchases(rows);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load purchases');
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  async function handleCreate() {
    if (!remark.trim()) {
      toast.error('Remark is required');
      return;
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setSaving(true);
    try {
      await posPurchasesService.create({
        remark: remark.trim(),
        amount: amt,
        purchasedAt: purchasedAt || undefined,
      });
      toast.success('Purchase logged');
      setDialogOpen(false);
      setRemark('');
      setAmount('');
      setPurchasedAt('');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await posPurchasesService.delete(id);
      toast.success('Purchase removed');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete');
    }
  }

  const total = purchases.reduce((sum, p) => sum + p.amount, 0);

  return (
    <PosShell>
      <div className="mx-auto max-w-3xl p-4 md:p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-black text-foreground">Purchases</h1>
            <p className="text-sm text-muted-foreground">
              Log what you spent — remark and amount only.
            </p>
          </div>
          <Button
            type="button"
            className="bg-bbq-flame font-display font-bold text-white hover:bg-bbq-flame/90"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add purchase
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-sm uppercase tracking-wide text-muted-foreground">
              Total logged
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-3xl font-black tabular-nums text-bbq-flame">
              RM {total.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : purchases.length === 0 ? (
          <p className="text-sm text-muted-foreground">No purchases logged yet.</p>
        ) : (
          <ul className="space-y-2">
            {purchases.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-foreground">{p.remark}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(p.purchasedAt).toLocaleString()}
                  </p>
                </div>
                <p className="font-display text-sm font-black tabular-nums text-bbq-flame">
                  RM {p.amount.toFixed(2)}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => handleDelete(p.id)}
                  aria-label="Delete purchase"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Add purchase</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="font-display text-xs">Amount (RM)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1"
                autoFocus
              />
            </div>
            <div>
              <Label className="font-display text-xs">Remark</Label>
              <Input
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="e.g. Charcoal supply"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="font-display text-xs">Date (optional)</Label>
              <Input
                type="datetime-local"
                value={purchasedAt}
                onChange={(e) => setPurchasedAt(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              disabled={saving}
              onClick={handleCreate}
              className="w-full bg-bbq-flame font-display font-bold text-white"
            >
              {saving ? 'Saving…' : 'Save purchase'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PosShell>
  );
}
