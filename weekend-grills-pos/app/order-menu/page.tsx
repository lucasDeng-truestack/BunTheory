'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PosShell } from '@/components/layout/pos-shell';
import { ProductDragGrid } from '@/components/order-menu/product-drag-grid';
import { CartPanel } from '@/components/order-menu/cart-panel';
import { CartDrawer } from '@/components/order-menu/cart-drawer';
import { CartMobileBar } from '@/components/order-menu/cart-mobile-bar';
import { ComboCardDialog } from '@/components/order-menu/combo-card-dialog';
import { VariantPickerDialog } from '@/components/order-menu/variant-picker-dialog';
import { posMenuService } from '@/services/pos-menu.service';
import { posSettingsService } from '@/services/settings.service';
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
import { PosMenuSection, PosProduct, productRequiresOptionPicker } from '@/types/pos';
import { cn } from '@/lib/utils';
import { useMobileCartLayout } from '@/hooks/use-mobile-cart';

const ProductFormDialog = dynamic(
  () =>
    import('@/components/order-menu/product-form-dialog').then((mod) => ({
      default: mod.ProductFormDialog,
    })),
);

export default function OrderMenuPage() {
  const router = useRouter();
  const addLine = useCartStore((s) => s.addLine);
  const [sections, setSections] = useState<PosMenuSection[]>([]);
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuEditMode, setMenuEditMode] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formInitial, setFormInitial] = useState<PosProduct | null>(null);
  const [productToDelete, setProductToDelete] = useState<PosProduct | null>(null);
  const [comboProduct, setComboProduct] = useState<PosProduct | null>(null);
  const [variantProduct, setVariantProduct] = useState<PosProduct | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const isMobileCart = useMobileCartLayout();

  useEffect(() => {
    if (!isMobileCart) setCartOpen(false);
  }, [isMobileCart]);

  const sortedSections = useMemo(
    () =>
      [...sections].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
      ),
    [sections],
  );

  const activeSection = sortedSections.find((s) => s.id === sectionId) ?? sortedSections[0];
  const products = activeSection?.products ?? [];

  const loadMenu = useCallback(async () => {
    try {
      const [menu, settings] = await Promise.all([
        posMenuService.getMenu(false),
        posSettingsService.getSettings().catch(() => null),
      ]);
      setSections(menu);
      setCompanyName(settings?.companyName ?? null);
      setSectionId((prev) => {
        if (prev && menu.some((s) => s.id === prev)) return prev;
        return menu[0]?.id ?? null;
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load menu');
    }
  }, []);

  useEffect(() => {
    loadMenu().finally(() => setLoading(false));
  }, [loadMenu]);

  function handleTapProduct(product: PosProduct) {
    if (menuEditMode) return;
    if (!product.available) {
      toast.error('This item is unavailable');
      return;
    }
    if (product.type === 'COMBO') {
      setComboProduct(product);
      return;
    }
    if (product.type === 'VARIANT') {
      setVariantProduct(product);
      return;
    }
    if (productRequiresOptionPicker(product)) {
      setComboProduct(product);
      return;
    }
    addLine({
      lineType: 'SIMPLE',
      productId: product.id,
      displayName: product.name,
      quantity: 1,
      unitPrice: product.basePrice,
      remarks: '',
    });
    toast.success(`${product.name} added`);
  }

  function handleReorder(reordered: PosProduct[]) {
    if (!activeSection) return;
    setSections((prev) =>
      prev.map((s) =>
        s.id === activeSection.id ? { ...s, products: reordered } : s,
      ),
    );
    void posMenuService
      .reorderProducts(
        activeSection.id,
        reordered.map((p) => p.id),
      )
      .catch((e) =>
        toast.error(e instanceof Error ? e.message : 'Failed to reorder'),
      );
  }

  function openCreateForm() {
    setFormInitial(null);
    setFormOpen(true);
  }

  function openEditForm(product: PosProduct) {
    setFormInitial(product);
    setFormOpen(true);
  }

  async function confirmDeleteProduct() {
    if (!productToDelete) return;
    try {
      await posMenuService.deleteProduct(productToDelete.id);
      toast.success('Product deleted');
      setProductToDelete(null);
      await loadMenu();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete');
    }
  }

  return (
    <PosShell>
      <div className="flex h-[calc(100vh-3rem)] md:h-[calc(100vh-3.5rem)]">
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0 border-b border-border bg-card px-4 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-display text-lg font-black text-foreground">
                  {companyName ?? 'Weekend Grillers'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Real Smoke, Bold Flavours
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={menuEditMode ? 'default' : 'outline'}
                  size="sm"
                  className="font-display text-xs"
                  onClick={() => setMenuEditMode((v) => !v)}
                >
                  {menuEditMode ? 'Done editing' : 'Edit menu'}
                </Button>
                {menuEditMode ? (
                  <Button
                    type="button"
                    size="sm"
                    className="bg-bbq-flame font-display text-xs text-white hover:bg-bbq-flame/90"
                    onClick={openCreateForm}
                  >
                    Add product
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {sortedSections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setSectionId(section.id)}
                  className={cn(
                    'rounded-full px-5 py-2.5 font-display text-sm font-bold transition',
                    activeSection?.id === section.id
                      ? 'bg-bbq-flame text-white shadow-sm'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
                  )}
                >
                  {section.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 pb-28 min-[701px]:pb-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading menu…</p>
            ) : products.length === 0 ? (
              <p className="text-sm text-muted-foreground">No products in this section.</p>
            ) : (
              <ProductDragGrid
                products={products}
                editMode={menuEditMode}
                onReorder={handleReorder}
                onTap={handleTapProduct}
                onEdit={openEditForm}
                onDelete={setProductToDelete}
              />
            )}

            <p className="mt-8 text-center font-display text-xs font-bold uppercase tracking-widest text-muted-foreground">
              No Colour, No Flavour
            </p>
          </div>
        </div>

        <div className="hidden h-full min-h-0 w-[min(100%,17.5rem)] shrink-0 min-[701px]:block">
          <CartPanel onReview={() => router.push('/customer-review')} />
        </div>
      </div>

      {isMobileCart ? (
        <>
          <CartMobileBar onOpen={() => setCartOpen(true)} />
          <CartDrawer
            open={cartOpen}
            onOpenChange={setCartOpen}
            onReview={() => router.push('/customer-review')}
          />
        </>
      ) : null}

      <ComboCardDialog
        product={comboProduct}
        open={Boolean(comboProduct)}
        onOpenChange={(open) => {
          if (!open) setComboProduct(null);
        }}
        onConfirm={({ product, unitPrice, choicesSummary, comboSelections, remarks }) => {
          addLine({
            lineType: product.type === 'COMBO' ? 'COMBO' : 'SIMPLE',
            productId: product.id,
            displayName: product.name,
            choicesSummary,
            comboSelections,
            quantity: 1,
            unitPrice,
            remarks,
          });
          toast.success(`${product.name} added`);
        }}
      />

      <VariantPickerDialog
        product={variantProduct}
        open={Boolean(variantProduct)}
        onOpenChange={(open) => {
          if (!open) setVariantProduct(null);
        }}
        onConfirm={({ product, variant, unitPrice, choicesSummary, comboSelections, remarks }) => {
          addLine({
            lineType: 'VARIANT',
            productId: product.id,
            variantId: variant.id,
            displayName: `${product.name} (${variant.name})`,
            choicesSummary,
            comboSelections,
            quantity: 1,
            unitPrice,
            remarks,
          });
          toast.success(`${product.name} added`);
        }}
      />

      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        sectionId={activeSection?.id ?? ''}
        initialProduct={formInitial}
        onSaved={loadMenu}
      />

      <AlertDialog
        open={Boolean(productToDelete)}
        onOpenChange={(open) => {
          if (!open) setProductToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Delete product?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove &quot;{productToDelete?.name}&quot; from the menu. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={confirmDeleteProduct}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PosShell>
  );
}
