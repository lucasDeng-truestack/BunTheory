'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ChevronLeft, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { PosShell } from '@/components/layout/pos-shell';
import { posInventoryService } from '@/services/pos-inventory.service';
import { InventoryPurchase } from '@/types/pos';

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<InventoryPurchase[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPurchases = useCallback(async () => {
    try {
      const data = await posInventoryService.getPurchases();
      setPurchases(data);
    } catch {
      toast.error('Failed to load purchases');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  return (
    <PosShell>
      <div className="flex h-full flex-col">
        <div className="border-b border-border bg-card px-5 py-3 flex items-center gap-3">
          <Link
            href="/inventory"
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm transition"
          >
            <ChevronLeft className="h-4 w-4" />
            Inventory
          </Link>
          <ShoppingCart className="h-5 w-5 text-bbq-flame ml-2" />
          <h1 className="font-display text-lg font-bold text-foreground">Purchase Records</h1>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-2">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />
            ))
          ) : purchases.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-52 text-muted-foreground">
              <ShoppingCart className="h-8 w-8 mb-2 opacity-30" />
              <p className="font-display font-semibold">No purchase records yet</p>
            </div>
          ) : (
            purchases.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-xl bg-card border border-border px-4 py-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-foreground text-sm">{p.itemName}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {p.quantity} {p.unit.toLowerCase()} · RM{' '}
                    {p.unitCostAvg.toFixed(2)} avg
                    {p.supplierName && ` · ${p.supplierName}`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-display font-bold text-bbq-flame tabular-nums">
                    RM {p.totalCost.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(p.purchasedAt).toLocaleDateString('en-MY')}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </PosShell>
  );
}
