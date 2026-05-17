'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PosShell } from '@/components/layout/pos-shell';
import { MenuItemCard } from '@/components/order-menu/menu-item-card';
import { CartPanel } from '@/components/order-menu/cart-panel';
import { posMenuService } from '@/services/pos-menu.service';
import { useCartStore } from '@/store/cart.store';
import { Button } from '@/components/ui/button';
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
import { MealBundleDialog } from '@/components/order-menu/meal-bundle-dialog';
import { PosCategory, PosMenuItem } from '@/types/pos';
import { groupItemsBySectionHeader } from '@/lib/pos-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';

const MenuItemFormDialog = dynamic(
  () =>
    import('@/components/order-menu/menu-item-form-dialog').then((mod) => ({
      default: mod.MenuItemFormDialog,
    })),
);

export default function OrderMenuPage() {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const addMealBundle = useCartStore((s) => s.addMealBundle);
  const [categories, setCategories] = useState<PosCategory[]>([]);
  const [items, setItems] = useState<PosMenuItem[]>([]);
  const [pillarId, setPillarId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuEditMode, setMenuEditMode] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formInitial, setFormInitial] = useState<PosMenuItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<PosMenuItem | null>(null);
  const [mealBuilderOpen, setMealBuilderOpen] = useState(false);
  const [mealBuilderMain, setMealBuilderMain] = useState<PosMenuItem | null>(null);

  const sortedCats = [...categories].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
  );

  const loadMenu = useCallback(async () => {
    try {
      const [cats, its] = await Promise.all([
        posMenuService.getCategories(),
        posMenuService.getItems(false),
      ]);
      setCategories(cats);
      setItems(its);
      setPillarId((prev) => {
        if (prev && cats.some((c) => c.id === prev)) return prev;
        const first =
          [...cats].sort(
            (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
          )[0]?.id ?? null;
        return first;
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load menu');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadMenu().finally(() => setLoading(false));
  }, [loadMenu]);

  const bundleSides = useMemo(
    () => items.filter((i) => i.kind === 'SIDE' && i.available),
    [items],
  );
  const bundleDrinks = useMemo(
    () => items.filter((i) => i.kind === 'DRINK_ADDON' && i.available),
    [items],
  );

  function handleAddItem(item: PosMenuItem) {
    addItem({
      menuItemId: item.id,
      name: item.name,
      description: item.description,
      image: item.image,
      quantity: 1,
      unitPrice: item.price,
      remarks: '',
    });
    toast.success(`${item.name} added`);
  }

  function handleTapItemForCart(item: PosMenuItem) {
    if (menuEditMode) return;
    if (!item.available) return;
    if (item.kind === 'MAIN_MEAL') {
      setMealBuilderMain(item);
      setMealBuilderOpen(true);
      return;
    }
    handleAddItem(item);
  }

  async function handleConfirmDelete() {
    if (!itemToDelete) return;
    try {
      await posMenuService.deleteItem(itemToDelete.id);
      toast.success('Menu item deleted');
      await loadMenu();
    } catch {
      toast.error('Could not delete item');
    } finally {
      setItemToDelete(null);
    }
  }

  function openCreateForm() {
    setFormInitial(null);
    setFormOpen(true);
  }

  function openEditForm(item: PosMenuItem) {
    setFormInitial(item);
    setFormOpen(true);
  }

  const itemsInPillar = pillarId ? items.filter((i) => i.categoryId === pillarId) : [];
  const gridForPillar = groupItemsBySectionHeader(itemsInPillar);
  const isEmpty = pillarId !== null ? itemsInPillar.length === 0 : true;

  return (
    <PosShell>
      <div className="flex h-full">
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
            <h1 className="font-display text-lg font-black tracking-tight">
              Menu
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              {!menuEditMode ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="font-display"
                  onClick={() => setMenuEditMode(true)}
                >
                  Edit
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="font-display"
                    onClick={() => setMenuEditMode(false)}
                  >
                    Done editing
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="font-display bg-bbq-flame text-white hover:bg-bbq-flame/90"
                    onClick={openCreateForm}
                  >
                    Add menu
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* McDonald&apos;s-style pillar strip — dropdown nav */}
          <div className="shrink-0 border-b border-border bg-card px-4 py-2">
            <label className="mb-1.5 block text-[10px] font-display font-bold uppercase tracking-wider text-muted-foreground">
              Mains · Sides · Drinks
            </label>
            <Select
              value={pillarId ?? ''}
              onValueChange={(v) => setPillarId(v)}
              disabled={sortedCats.length === 0}
            >
              <SelectTrigger className="h-12 w-full max-w-xl font-display text-base font-black">
                <span className="truncate">
                  {sortedCats.find((c) => c.id === pillarId)?.name ??
                    (sortedCats.length ? 'Choose pillar…' : 'Loading…')}
                </span>
              </SelectTrigger>
              <SelectContent className="max-h-[min(70vh,var(--radix-select-content-available-height))]">
                {sortedCats.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="font-display text-base py-3">
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-5">
            {loading ? (
              <div className="grid grid-cols-2 gap-4 min-[768px]:grid-cols-2 min-[768px]:gap-5 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-5/4 min-h-44 animate-pulse rounded-2xl bg-muted min-[768px]:aspect-4/3 min-[768px]:min-h-36"
                  />
                ))}
              </div>
            ) : isEmpty ? (
              <div className="flex h-48 flex-col items-center justify-center text-muted-foreground">
                <span className="mb-2 text-4xl">🍖</span>
                <p className="font-display">
                  Nothing in this pillar yet — edit menu or pick another pillar
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {gridForPillar.map(({ title, subtitle, items: groupItems }) => (
                  <section key={`${pillarId}-${title}`}>
                      <div className="mb-3">
                        <h2 className="font-display text-xs font-bold uppercase tracking-wide text-muted-foreground">
                          {title}
                        </h2>
                        {subtitle ? (
                          <p className="mt-1 text-[11px] text-muted-foreground/90">
                            {subtitle}
                          </p>
                        ) : null}
                      </div>
                    <div className="grid grid-cols-2 gap-4 min-[768px]:grid-cols-2 min-[768px]:gap-5 lg:grid-cols-3 xl:grid-cols-4">
                      {groupItems.map((item) => (
                        <MenuItemCard
                          key={item.id}
                          item={item}
                          editMode={menuEditMode}
                          onAdd={handleTapItemForCart}
                          onEdit={openEditForm}
                          onDelete={setItemToDelete}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="hidden h-full w-72 shrink-0 overflow-hidden md:block lg:w-80">
          <CartPanel onReview={() => router.push('/customer-review')} />
        </div>
      </div>

      <MenuItemFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        categories={categories}
        initialItem={formInitial}
        defaultCategoryId={pillarId}
        onSaved={() => loadMenu()}
      />

      <MealBundleDialog
        open={mealBuilderOpen}
        onOpenChange={(o) => {
          setMealBuilderOpen(o);
          if (!o) setMealBuilderMain(null);
        }}
        main={mealBuilderMain}
        sides={bundleSides}
        drinks={bundleDrinks}
        onConfirm={(p) => {
          if (!mealBuilderMain) return;
          addMealBundle({
            main: mealBuilderMain,
            mainQuantity: p.mainQuantity,
            mainRemarks: p.mainRemarks,
            extras: p.extras.map((x) => ({
              item: x.item,
              quantity: Math.max(1, Math.floor(x.quantity)),
            })),
          });
          const n = p.extras.filter((x) => x.quantity > 0).length;
          toast.success(
            `${mealBuilderMain.name} added${n ? ` · ${n} extra line${n > 1 ? 's' : ''}` : ''}`,
          );
          setMealBuilderMain(null);
        }}
      />

      <AlertDialog
        open={!!itemToDelete}
        onOpenChange={(o) => !o && setItemToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              Delete this item?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {itemToDelete
                ? `“${itemToDelete.name}” will be removed from the POS menu.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-display">Cancel</AlertDialogCancel>
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
