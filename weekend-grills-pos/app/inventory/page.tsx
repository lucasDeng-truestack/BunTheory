'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Package, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { PosShell } from '@/components/layout/pos-shell';
import { InventoryItemFormDialog } from '@/components/inventory/inventory-item-form-dialog';
import { posInventoryService } from '@/services/pos-inventory.service';
import { InventoryItem } from '@/types/pos';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

const UNIT_LABELS: Record<string, string> = {
  GRAM: 'g',
  KG: 'kg',
  ML: 'ml',
  LITER: 'L',
  PIECE: 'pc',
  PACK: 'pack',
};

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formInitial, setFormInitial] = useState<InventoryItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      const data = await posInventoryService.getItems();
      setItems(data);
    } catch {
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  function openCreateForm() {
    setFormInitial(null);
    setFormOpen(true);
  }

  function openEditForm(item: InventoryItem) {
    setFormInitial(item);
    setFormOpen(true);
  }

  async function handleConfirmDelete() {
    if (!itemToDelete) return;
    try {
      await posInventoryService.deleteItem(itemToDelete.id);
      toast.success('Inventory item deleted');
      await fetchItems();
    } catch {
      toast.error('Could not delete item');
    } finally {
      setItemToDelete(null);
    }
  }

  const lowStock = items.filter((i) => i.isLowStock);
  const unit = (i: InventoryItem) => UNIT_LABELS[i.unit] ?? i.unit;

  return (
    <PosShell>
      <div className="flex h-full flex-col">
        <div className="border-b border-border bg-card px-5 py-3 flex items-center gap-3">
          <Package className="h-5 w-5 text-bbq-flame" />
          <div>
            <h1 className="font-display text-lg font-bold text-foreground">
              Inventory
            </h1>
            <p className="text-xs text-muted-foreground">
              {items.length} ingredient{items.length !== 1 ? 's' : ''}
              {lowStock.length > 0 && (
                <span className="ml-2 text-destructive font-semibold">
                  · {lowStock.length} low stock
                </span>
              )}
            </p>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <Link href="/inventory/purchases">
              <Button variant="outline" size="sm" className="font-display">
                Purchases
              </Button>
            </Link>
            {!editMode ? (
              <Button
                variant="outline"
                size="sm"
                className="font-display"
                onClick={() => setEditMode(true)}
              >
                Edit
              </Button>
            ) : (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  className="font-display"
                  onClick={() => setEditMode(false)}
                >
                  Done editing
                </Button>
                <Button
                  size="sm"
                  className="font-display bg-bbq-flame hover:bg-bbq-flame/90 text-white"
                  onClick={openCreateForm}
                >
                  Add item
                </Button>
              </>
            )}
          </div>
        </div>

        {lowStock.length > 0 && (
          <div className="flex items-center gap-2 px-5 py-2 bg-red-50/60 border-b border-red-100/60 text-destructive text-xs font-medium">
            <AlertTriangle className="h-3.5 w-3.5" />
            Low stock: {lowStock.map((i) => i.name).join(', ')}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 md:p-5">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-14 rounded-xl bg-muted animate-pulse"
                />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-52 text-muted-foreground">
              <Package className="h-8 w-8 mb-2 opacity-30" />
              <p className="font-display font-semibold">
                No inventory items yet
              </p>
              {!editMode && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 font-display"
                  onClick={() => {
                    setEditMode(true);
                    openCreateForm();
                  }}
                >
                  Add your first item
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {items.map((item) => (
                <Card
                  key={item.id}
                  size="sm"
                  className={cn(
                    'relative transition-all',
                    item.isLowStock && 'ring-destructive/30',
                    editMode && 'cursor-pointer hover:ring-2 hover:ring-bbq-flame/30',
                  )}
                  onClick={editMode ? () => openEditForm(item) : undefined}
                >
                  <CardHeader>
                    <CardTitle className="font-display text-sm">
                      {item.name}
                    </CardTitle>
                    <CardDescription>
                      {UNIT_LABELS[item.unit] ?? item.unit}
                    </CardDescription>
                    <CardAction>
                      {item.isLowStock ? (
                        <Badge variant="destructive">Low</Badge>
                      ) : (
                        <Badge variant="secondary">OK</Badge>
                      )}
                    </CardAction>
                  </CardHeader>
                  <CardContent className={cn(editMode && 'pb-14')}>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-lg bg-muted/50 px-3 py-2">
                        <p className="text-[10px] text-muted-foreground font-display uppercase">
                          In stock
                        </p>
                        <p className="font-display font-black text-foreground tabular-nums">
                          {item.currentStock.toFixed(1)}{' '}
                          <span className="text-[11px] font-normal">
                            {unit(item)}
                          </span>
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/50 px-3 py-2">
                        <p className="text-[10px] text-muted-foreground font-display uppercase">
                          Avg cost
                        </p>
                        <p className="font-display font-black text-foreground tabular-nums">
                          RM {item.avgUnitCost.toFixed(2)}
                          <span className="text-[11px] font-normal">
                            /{unit(item)}
                          </span>
                        </p>
                      </div>
                      <div className="col-span-2 rounded-lg bg-muted/50 px-3 py-2">
                        <p className="text-[10px] text-muted-foreground font-display uppercase">
                          Total purchased
                        </p>
                        <p className="font-semibold text-foreground text-sm tabular-nums">
                          {item.totalPurchased.toFixed(1)} {unit(item)} ·{' '}
                          <span className="text-bbq-flame">
                            RM {item.totalCostPaid.toFixed(2)}
                          </span>
                        </p>
                      </div>
                    </div>
                  </CardContent>

                  {editMode && (
                    <div
                      className="absolute bottom-0 left-0 right-0 flex gap-1 border-t border-border bg-card/95 p-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="flex-1 font-display text-xs"
                        onClick={() => openEditForm(item)}
                      >
                        <Pencil className="mr-1 h-3 w-3" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="font-display text-xs"
                        onClick={() => setItemToDelete(item)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <InventoryItemFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initialItem={formInitial}
        onSaved={() => fetchItems()}
      />

      <AlertDialog
        open={!!itemToDelete}
        onOpenChange={(o) => !o && setItemToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              Delete this inventory item?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {itemToDelete
                ? `"${itemToDelete.name}" and its stock history will be removed.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-display">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="font-display bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PosShell>
  );
}
