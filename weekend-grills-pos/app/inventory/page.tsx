'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Boxes, Plus, Trash2 } from 'lucide-react';
import { PosShell } from '@/components/layout/pos-shell';
import { posInventoryService } from '@/services/pos-inventory.service';
import { posMenuService } from '@/services/pos-menu.service';
import { PosInventoryItem, PosMenuSection } from '@/types/pos';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

type RecipeRow = { inventoryItemId: string; quantityPerUnit: string };

const LONG_INVENTORY_NAME_LENGTH = 18;

function getInventoryInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || '?';
}

function isLongInventoryName(name: string) {
  return name.trim().length > LONG_INVENTORY_NAME_LENGTH;
}

function InventoryNameMark({
  name,
  compact = false,
}: {
  name: string;
  compact?: boolean;
}) {
  if (!isLongInventoryName(name)) return null;

  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center bg-bbq-flame font-display font-black text-white shadow-sm',
        compact
          ? 'size-6 rounded-lg text-sm'
          : 'size-11 rounded-2xl text-2xl',
      )}
    >
      {getInventoryInitial(name)}
    </span>
  );
}

export default function InventoryPage() {
  const [items, setItems] = useState<PosInventoryItem[]>([]);
  const [menu, setMenu] = useState<PosMenuSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PosInventoryItem | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemUnit, setItemUnit] = useState('');
  const [itemCountable, setItemCountable] = useState(true);
  const [itemQty, setItemQty] = useState('0');
  const [itemLow, setItemLow] = useState('');
  const [savingItem, setSavingItem] = useState(false);

  const [selectedProductId, setSelectedProductId] = useState('');
  const [recipeRows, setRecipeRows] = useState<RecipeRow[]>([]);
  const [savingRecipe, setSavingRecipe] = useState(false);

  const load = useCallback(async () => {
    try {
      const [stock, menuData] = await Promise.all([
        posInventoryService.listItems(),
        posMenuService.getMenu(false),
      ]);
      setItems(stock);
      setMenu(menuData);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load inventory');
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const allProducts = useMemo(
    () =>
      menu.flatMap((s) =>
        s.products.map((p) => ({ ...p, sectionName: s.name })),
      ),
    [menu],
  );

  const productNameById = useMemo(
    () =>
      new Map(
        allProducts.map((product) => [
          product.id,
          `${product.sectionName} — ${product.name}`,
        ]),
      ),
    [allProducts],
  );

  const inventoryItemById = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items],
  );

  useEffect(() => {
    if (!selectedProductId && allProducts[0]) {
      setSelectedProductId(allProducts[0].id);
    }
  }, [allProducts, selectedProductId]);

  useEffect(() => {
    if (!selectedProductId) return;
    void (async () => {
      try {
        const links = await posInventoryService.getProductIngredients(
          selectedProductId,
        );
        setRecipeRows(
          links.map((l) => ({
            inventoryItemId: l.inventoryItemId,
            quantityPerUnit: String(l.quantityPerUnit),
          })),
        );
      } catch {
        setRecipeRows([]);
      }
    })();
  }, [selectedProductId]);

  function openNewItem() {
    setEditingItem(null);
    setItemName('');
    setItemUnit('pc');
    setItemCountable(true);
    setItemQty('0');
    setItemLow('');
    setItemDialogOpen(true);
  }

  function openEditItem(item: PosInventoryItem) {
    setEditingItem(item);
    setItemName(item.name);
    setItemUnit(item.unit ?? '');
    setItemCountable(item.isCountable);
    setItemQty(String(item.quantityOnHand));
    setItemLow(
      item.lowStockThreshold != null ? String(item.lowStockThreshold) : '',
    );
    setItemDialogOpen(true);
  }

  async function saveItem() {
    if (!itemName.trim()) {
      toast.error('Name is required');
      return;
    }
    const qty = Number(itemQty);
    if (!Number.isFinite(qty) || qty < 0) {
      toast.error('Invalid quantity');
      return;
    }
    const low = itemLow.trim() ? Number(itemLow) : undefined;
    if (low !== undefined && (!Number.isFinite(low) || low < 0)) {
      toast.error('Invalid low-stock threshold');
      return;
    }
    setSavingItem(true);
    try {
      if (editingItem) {
        await posInventoryService.updateItem(editingItem.id, {
          name: itemName.trim(),
          unit: itemUnit.trim() || undefined,
          isCountable: itemCountable,
          quantityOnHand: qty,
          lowStockThreshold: low ?? null,
        });
        toast.success('Stock updated');
      } else {
        await posInventoryService.createItem({
          name: itemName.trim(),
          unit: itemUnit.trim() || undefined,
          isCountable: itemCountable,
          quantityOnHand: qty,
          lowStockThreshold: low,
        });
        toast.success('Item added');
      }
      setItemDialogOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSavingItem(false);
    }
  }

  async function deleteItem(id: string) {
    try {
      await posInventoryService.deleteItem(id);
      toast.success('Item removed');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete');
    }
  }

  function addRecipeRow() {
    const first = items[0];
    if (!first) return;
    setRecipeRows((prev) => [
      ...prev,
      { inventoryItemId: first.id, quantityPerUnit: '1' },
    ]);
  }

  async function saveRecipe() {
    if (!selectedProductId) return;
    const ingredients = recipeRows
      .map((r) => ({
        inventoryItemId: r.inventoryItemId,
        quantityPerUnit: Number(r.quantityPerUnit),
      }))
      .filter((r) => r.inventoryItemId && r.quantityPerUnit > 0);
    setSavingRecipe(true);
    try {
      await posInventoryService.setProductIngredients(
        selectedProductId,
        ingredients,
      );
      toast.success('Recipe saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save recipe');
    } finally {
      setSavingRecipe(false);
    }
  }

  return (
    <PosShell>
      <div className="mx-auto max-w-4xl p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Boxes className="h-6 w-6 text-bbq-flame" />
          <div>
            <h1 className="font-display text-2xl font-black">Inventory</h1>
            <p className="text-sm text-muted-foreground">
              Countable stock is deducted when kitchen taps Start Cooking.
              Sauces and fries can be listed but won&apos;t reduce stock.
            </p>
          </div>
        </div>

        <Tabs defaultValue="stock">
          <TabsList className="font-display">
            <TabsTrigger value="stock">Stock</TabsTrigger>
            <TabsTrigger value="recipes">Menu recipes</TabsTrigger>
          </TabsList>

          <TabsContent value="stock" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Button
                type="button"
                className="bg-bbq-flame font-display font-bold text-white"
                onClick={openNewItem}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add item
              </Button>
            </div>

            {loading ? (
              <div className="h-40 rounded-xl bg-muted animate-pulse" />
            ) : items.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-10">
                No inventory items yet.
              </p>
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
                  <Card key={item.id} size="sm">
                    <CardContent className="flex flex-wrap items-center gap-3 py-3">
                      <InventoryNameMark name={item.name} />
                      <div className="flex-1 min-w-[140px]" title={item.name}>
                        <p className="font-display font-bold">
                          {isLongInventoryName(item.name)
                            ? getInventoryInitial(item.name)
                            : item.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isLongInventoryName(item.name) ? `${item.name} · ` : ''}
                          {item.isCountable
                            ? 'Countable — deducted on cook'
                            : 'Reference only — not deducted'}
                          {item.unit ? ` · ${item.unit}` : ''}
                        </p>
                      </div>
                      {item.isCountable ? (
                        <div className="text-right">
                          <p
                            className={cn(
                              'font-display text-xl font-black tabular-nums',
                              item.isLowStock && 'text-bbq-flame',
                            )}
                          >
                            {item.quantityOnHand}
                          </p>
                          {item.isLowStock && (
                            <Badge variant="destructive" className="font-display text-[10px]">
                              Low stock
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="font-display"
                          onClick={() => openEditItem(item)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => deleteItem(item.id)}
                          aria-label="Delete item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="recipes" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-base">
                  Ingredients per menu item
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="font-display">Menu item</Label>
                  <Select
                    value={selectedProductId}
                    onValueChange={(v) => v && setSelectedProductId(v)}
                  >
                    <SelectTrigger className="mt-1 font-display">
                      <SelectValue placeholder="Select product">
                        {productNameById.get(selectedProductId) ?? 'Select product'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {allProducts.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="font-display">
                          {p.sectionName} — {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {recipeRows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No ingredients linked. Add rows for each countable item used
                    per plate (e.g. 1 chicken leg, 1 grilled corn).
                  </p>
                ) : (
                  <div className="space-y-2">
                    {recipeRows.map((row, index) => (
                      <div key={index} className="flex flex-wrap gap-2 items-end">
                        <div className="flex-1 min-w-[160px]">
                          <Label className="text-xs">Ingredient</Label>
                          {(() => {
                            const selectedInventoryItem = inventoryItemById.get(
                              row.inventoryItemId,
                            );

                            return (
                          <Select
                            value={row.inventoryItemId}
                            onValueChange={(v) => {
                              if (!v) return;
                              setRecipeRows((prev) =>
                                prev.map((r, i) =>
                                  i === index ? { ...r, inventoryItemId: v } : r,
                                ),
                              );
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue>
                                {selectedInventoryItem ? (
                                  <span
                                    className="flex min-w-0 items-center gap-2"
                                    title={selectedInventoryItem.name}
                                  >
                                    <InventoryNameMark
                                      name={selectedInventoryItem.name}
                                      compact
                                    />
                                    <span className="truncate">
                                      {isLongInventoryName(selectedInventoryItem.name)
                                        ? getInventoryInitial(selectedInventoryItem.name)
                                        : selectedInventoryItem.name}
                                    </span>
                                  </span>
                                ) : (
                                  'Select ingredient'
                                )}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {items.map((it) => (
                                <SelectItem key={it.id} value={it.id}>
                                  <span className="flex min-w-0 items-center gap-2">
                                    <InventoryNameMark name={it.name} compact />
                                    <span className="truncate">
                                      {isLongInventoryName(it.name)
                                        ? getInventoryInitial(it.name)
                                        : it.name}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {isLongInventoryName(it.name) ? it.name : ''}
                                      {!it.isCountable ? ' (not deducted)' : ''}
                                    </span>
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                            );
                          })()}
                        </div>
                        <div className="w-24">
                          <Label className="text-xs">Per plate</Label>
                          <Input
                            type="number"
                            min={0.01}
                            step={0.01}
                            value={row.quantityPerUnit}
                            onChange={(e) =>
                              setRecipeRows((prev) =>
                                prev.map((r, i) =>
                                  i === index
                                    ? { ...r, quantityPerUnit: e.target.value }
                                    : r,
                                ),
                              )
                            }
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() =>
                            setRecipeRows((prev) => prev.filter((_, i) => i !== index))
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="font-display"
                    onClick={addRecipeRow}
                    disabled={items.length === 0}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add ingredient
                  </Button>
                  <Button
                    type="button"
                    className="bg-bbq-flame font-display font-bold text-white"
                    onClick={saveRecipe}
                    disabled={!selectedProductId || savingRecipe}
                  >
                    Save recipe
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingItem ? 'Edit stock item' : 'New stock item'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={itemName} onChange={(e) => setItemName(e.target.value)} />
            </div>
            <div>
              <Label>Unit (optional)</Label>
              <Input
                value={itemUnit}
                onChange={(e) => setItemUnit(e.target.value)}
                placeholder="pc, leg, batch"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="countable"
                checked={itemCountable}
                onCheckedChange={(v) => setItemCountable(v === true)}
              />
              <Label htmlFor="countable" className="font-normal">
                Countable (deduct when Start Cooking)
              </Label>
            </div>
            {itemCountable && (
              <>
                <div>
                  <Label>Quantity on hand</Label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={itemQty}
                    onChange={(e) => setItemQty(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Low-stock alert at (optional)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={itemLow}
                    onChange={(e) => setItemLow(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              className="bg-bbq-flame font-display font-bold text-white"
              onClick={saveItem}
              disabled={savingItem}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PosShell>
  );
}
