'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Boxes,
  ClipboardList,
  Minus,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { PosShell } from '@/components/layout/pos-shell';
import { posInventoryService } from '@/services/pos-inventory.service';
import { posMenuService } from '@/services/pos-menu.service';
import { PosStockItem, PosStockOverview, PosStockProduct } from '@/types/pos';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

/**
 * Stock & availability. Two questions, one tab each:
 * - "On sale": can the till sell this menu item right now? A manual on/off switch, plus how
 *   many plates the stock can still make. Sold out happens by itself when stock runs out.
 * - "Stock": how much of each ingredient is left. Quick +1 / -1, Restock (add a delivery) and
 *   Count (type what is on the shelf). Every change goes to the server as a change, so it never
 *   overwrites what the kitchen used meanwhile.
 * Stock goes down when the kitchen taps Start Cooking.
 */

const LOW_SERVINGS = 5;
const REFRESH_MS = 30_000;

type ProductRow = PosStockProduct & { sectionName: string };

function errorText(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

function fmtQty(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '');
}

/** What the till sees for one menu item, in plain words. */
function productState(p: PosStockProduct): {
  label: string;
  detail: string;
  tone: 'off' | 'out' | 'low' | 'ok' | 'untracked';
} {
  if (!p.available) {
    return { label: 'Off', detail: 'Hidden from the till.', tone: 'off' };
  }
  if (p.tracked && (p.servingsLeft ?? 0) < 1) {
    return {
      label: 'Sold out',
      detail: `Out of ${p.limitedBy}. Add stock to sell it again.`,
      tone: 'out',
    };
  }
  if (p.tracked) {
    const n = p.servingsLeft ?? 0;
    return {
      label: `${n} left`,
      detail: `Runs out with ${p.limitedBy}.`,
      tone: n <= LOW_SERVINGS ? 'low' : 'ok',
    };
  }
  return {
    label: 'On sale',
    detail: 'No stock linked, so it never sells out by itself.',
    tone: 'untracked',
  };
}

const TONE_CLASS: Record<ReturnType<typeof productState>['tone'], string> = {
  off: 'bg-muted text-muted-foreground',
  out: 'bg-bbq-red text-white',
  low: 'bg-bbq-mango text-bbq-charcoal',
  ok: 'bg-bbq-green text-white',
  untracked: 'bg-bbq-green/15 text-bbq-green',
};

/** Large on/off switch for tablets. */
function SaleSwitch({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-10 w-[76px] shrink-0 items-center rounded-full border-2 font-display text-xs font-bold transition-colors disabled:opacity-50',
        checked
          ? 'border-bbq-green bg-bbq-green text-white'
          : 'border-border bg-muted text-muted-foreground',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'absolute top-1 size-7 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-[38px]' : 'translate-x-1',
        )}
      />
      <span
        aria-hidden
        className={cn('w-full px-2', checked ? 'pr-9 text-left' : 'pl-9 text-right')}
      >
        {checked ? 'ON' : 'OFF'}
      </span>
    </button>
  );
}

export default function InventoryPage() {
  const [data, setData] = useState<PosStockOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState<string>('sale');

  const [recipeFor, setRecipeFor] = useState<ProductRow | null>(null);
  const [qtyFor, setQtyFor] = useState<{ item: PosStockItem; mode: 'add' | 'set' } | null>(null);
  const [editing, setEditing] = useState<PosStockItem | 'new' | null>(null);
  const [deleting, setDeleting] = useState<PosStockItem | null>(null);

  const load = useCallback(async (quiet = false) => {
    try {
      setData(await posInventoryService.getOverview());
    } catch (e) {
      if (!quiet) toast.error(errorText(e, 'Could not load stock'));
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  // The kitchen uses stock on other devices. Keep the numbers fresh while this screen is open.
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible') void load(true);
    };
    const id = window.setInterval(tick, REFRESH_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [load]);

  const products = useMemo<ProductRow[]>(
    () =>
      (data?.sections ?? []).flatMap((s) =>
        s.products.map((p) => ({ ...p, sectionName: s.name })),
      ),
    [data],
  );
  const items = data?.items ?? [];

  const soldOut = products.filter((p) => productState(p).tone === 'out');
  const off = products.filter((p) => !p.available);
  const low = items.filter((i) => i.isLowStock);

  async function setAvailable(p: ProductRow, next: boolean) {
    setBusy(p.id);
    try {
      await posMenuService.updateProduct(p.id, { available: next });
      toast.success(next ? `${p.name} is on sale` : `${p.name} is off the till`);
      await load(true);
    } catch (e) {
      toast.error(errorText(e, 'Could not change it'));
    } finally {
      setBusy(null);
    }
  }

  async function nudge(item: PosStockItem, amount: number) {
    setBusy(item.id);
    try {
      await posInventoryService.adjustStock(item.id, { mode: 'add', amount });
      await load(true);
    } catch (e) {
      toast.error(errorText(e, 'Could not change the count'));
    } finally {
      setBusy(null);
    }
  }

  async function removeItem(item: PosStockItem) {
    try {
      await posInventoryService.deleteItem(item.id);
      toast.success(`${item.name} removed`);
      setDeleting(null);
      await load(true);
    } catch (e) {
      toast.error(errorText(e, 'Could not remove it'));
    }
  }

  return (
    <PosShell>
      <div className="mx-auto max-w-4xl space-y-5 p-4 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Boxes className="h-6 w-6 shrink-0 text-bbq-flame" />
            <div>
              <h1 className="font-display text-2xl font-black">Stock &amp; availability</h1>
              <p className="text-sm text-muted-foreground">
                Switch menu items on or off, and keep stock counts right. Stock goes down
                when the kitchen taps Start Cooking.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-10 font-display"
            onClick={() => void load()}
          >
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {!loading && (soldOut.length > 0 || low.length > 0) && (
          <div className="flex flex-wrap gap-2">
            {soldOut.length > 0 && (
              <button
                type="button"
                onClick={() => setTab('sale')}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-bbq-red/10 px-3 text-sm font-semibold text-bbq-red"
              >
                <AlertTriangle className="h-4 w-4" />
                {soldOut.length} sold out: {soldOut.map((p) => p.name).join(', ')}
              </button>
            )}
            {low.length > 0 && (
              <button
                type="button"
                onClick={() => setTab('stock')}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-bbq-mango/20 px-3 text-sm font-semibold text-foreground"
              >
                <AlertTriangle className="h-4 w-4 text-bbq-flame" />
                Running low: {low.map((i) => i.name).join(', ')}
              </button>
            )}
          </div>
        )}

        <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
          <TabsList className="h-11 font-display">
            <TabsTrigger value="sale" className="px-4">
              On sale{off.length ? ` (${off.length} off)` : ''}
            </TabsTrigger>
            <TabsTrigger value="stock" className="px-4">
              Stock
            </TabsTrigger>
          </TabsList>

          {/* ── On sale ─────────────────────────────────────────── */}
          <TabsContent value="sale" className="mt-4 space-y-5">
            {loading ? (
              <div className="h-40 animate-pulse rounded-xl bg-muted" />
            ) : products.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No menu items yet. Add them from the Menu screen.
              </p>
            ) : (
              (data?.sections ?? [])
                .filter((s) => s.products.length > 0)
                .map((section) => (
                  <section key={section.id} className="space-y-2">
                    <h2 className="font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">
                      {section.name}
                    </h2>
                    <ul className="space-y-2">
                      {section.products.map((p) => {
                        const st = productState(p);
                        const row = { ...p, sectionName: section.name };
                        return (
                          <li
                            key={p.id}
                            className={cn(
                              'flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-3',
                              st.tone === 'out' && 'border-bbq-red/50',
                            )}
                          >
                            <div className="min-w-[180px] flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-display font-bold">{p.name}</p>
                                <span
                                  className={cn(
                                    'rounded-full px-2.5 py-0.5 font-display text-xs font-bold',
                                    TONE_CLASS[st.tone],
                                  )}
                                >
                                  {st.label}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">{st.detail}</p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {p.recipe.length
                                  ? `Uses ${p.recipe
                                      .map(
                                        (r) =>
                                          `${fmtQty(r.quantityPerUnit)} ${r.name}`,
                                      )
                                      .join(', ')} per order`
                                  : null}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              className="h-10 font-display"
                              onClick={() => setRecipeFor(row)}
                            >
                              <ClipboardList className="mr-1.5 h-4 w-4" />
                              {p.recipe.length ? 'Stock used' : 'Link stock'}
                            </Button>
                            <SaleSwitch
                              checked={p.available}
                              disabled={busy === p.id}
                              label={`${p.name} on sale`}
                              onChange={(next) => void setAvailable(row, next)}
                            />
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))
            )}
          </TabsContent>

          {/* ── Stock ───────────────────────────────────────────── */}
          <TabsContent value="stock" className="mt-4 space-y-3">
            <div className="flex justify-end">
              <Button
                type="button"
                className="h-10 bg-bbq-flame font-display font-bold text-white"
                onClick={() => setEditing('new')}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Add stock item
              </Button>
            </div>

            {loading ? (
              <div className="h-40 animate-pulse rounded-xl bg-muted" />
            ) : items.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No stock items yet. Add the things you count, like chicken legs or corn,
                then link them to menu items under On sale.
              </p>
            ) : (
              <ul className="space-y-2">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className={cn(
                      'grid gap-3 rounded-2xl border bg-card p-3 sm:grid-cols-[1fr_auto] sm:items-center',
                      item.isLowStock && 'border-bbq-mango',
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-display font-bold [overflow-wrap:anywhere]">
                          {item.name}
                        </p>
                        {item.isLowStock && (
                          <Badge className="bg-bbq-mango font-display text-[10px] text-bbq-charcoal">
                            Running low
                          </Badge>
                        )}
                        {!item.isCountable && (
                          <Badge variant="outline" className="font-display text-[10px]">
                            Not counted
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {item.usedBy.length
                          ? `Used in ${item.usedBy.map((u) => u.name).join(', ')}`
                          : 'Not used by any menu item yet.'}
                        {item.isCountable && item.lowStockThreshold != null
                          ? ` · Warn at ${fmtQty(item.lowStockThreshold)}`
                          : ''}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      {item.isCountable && (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="size-10"
                            aria-label={`Take one ${item.name} away`}
                            disabled={busy === item.id || item.quantityOnHand < 1}
                            onClick={() => void nudge(item, -1)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <p
                            className={cn(
                              'min-w-[64px] text-center font-display text-2xl font-black tabular-nums',
                              item.isLowStock && 'text-bbq-flame',
                            )}
                            aria-live="polite"
                          >
                            {fmtQty(item.quantityOnHand)}
                            {item.unit ? (
                              <span className="ml-1 text-xs font-bold text-muted-foreground">
                                {item.unit}
                              </span>
                            ) : null}
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="size-10"
                            aria-label={`Add one ${item.name}`}
                            disabled={busy === item.id}
                            onClick={() => void nudge(item, 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            className="h-10 bg-bbq-flame font-display font-bold text-white"
                            onClick={() => setQtyFor({ item, mode: 'add' })}
                          >
                            Restock
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-10 font-display"
                            onClick={() => setQtyFor({ item, mode: 'set' })}
                          >
                            Count
                          </Button>
                        </>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-10"
                        aria-label={`Edit ${item.name}`}
                        onClick={() => setEditing(item)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-10 text-destructive"
                        aria-label={`Remove ${item.name}`}
                        onClick={() => setDeleting(item)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {qtyFor && (
        <QuantityDialog
          key={`${qtyFor.item.id}-${qtyFor.mode}`}
          item={qtyFor.item}
          mode={qtyFor.mode}
          onClose={() => setQtyFor(null)}
          onDone={async () => {
            setQtyFor(null);
            await load(true);
          }}
        />
      )}

      {editing && (
        <ItemDialog
          key={editing === 'new' ? 'new' : editing.id}
          item={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onDone={async () => {
            setEditing(null);
            await load(true);
          }}
        />
      )}

      {recipeFor && (
        <RecipeDialog
          key={recipeFor.id}
          product={recipeFor}
          items={items}
          onClose={() => setRecipeFor(null)}
          onDone={async () => {
            setRecipeFor(null);
            await load(true);
          }}
        />
      )}

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="content-start">
          <DialogHeader>
            <DialogTitle className="font-display">Remove {deleting?.name}?</DialogTitle>
            <DialogDescription>
              {deleting?.usedBy.length
                ? `It is also taken out of ${deleting.usedBy.map((u) => u.name).join(', ')}. Those items will no longer sell out by themselves.`
                : 'It is not used by any menu item.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" className="h-10" onClick={() => setDeleting(null)}>
              Keep it
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-10 font-display font-bold"
              onClick={() => deleting && void removeItem(deleting)}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PosShell>
  );
}

// ─── Restock / Count ─────────────────────────────────────────────────────────

function QuantityDialog({
  item,
  mode,
  onClose,
  onDone,
}: {
  item: PosStockItem;
  mode: 'add' | 'set';
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const unit = item.unit ? ` ${item.unit}` : '';
  // The server keeps two decimals, so round here rather than have it refuse 0.333.
  const n = Math.round(Number(value) * 100) / 100;
  const valid = value.trim() !== '' && Number.isFinite(n) && (mode === 'add' ? n > 0 : n >= 0);

  async function save() {
    if (!valid) return;
    setSaving(true);
    try {
      await posInventoryService.adjustStock(item.id, { mode, amount: n });
      toast.success(
        mode === 'add'
          ? `Added ${fmtQty(n)}${unit} of ${item.name}`
          : `${item.name} is now ${fmtQty(n)}${unit}`,
      );
      await onDone();
    } catch (e) {
      toast.error(errorText(e, 'Could not save'));
      setSaving(false);
    }
  }

  const presets = mode === 'add' ? [5, 10, 20, 50] : [0];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="content-start">
        <DialogHeader>
          <DialogTitle className="font-display">
            {mode === 'add' ? `Restock ${item.name}` : `Count ${item.name}`}
          </DialogTitle>
          <DialogDescription>
            {mode === 'add'
              ? `You have ${fmtQty(item.quantityOnHand)}${unit} now. How many came in?`
              : `The screen says ${fmtQty(item.quantityOnHand)}${unit}. Type what you actually have.`}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <Input
            autoFocus
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            className="h-12 text-center font-display text-2xl font-black"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-label={mode === 'add' ? 'Amount added' : 'Amount counted'}
          />
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <Button
                key={p}
                type="button"
                variant="outline"
                className="h-10 min-w-14 font-display"
                onClick={() => setValue(String(p))}
              >
                {mode === 'add' ? `+${p}` : `None left`}
              </Button>
            ))}
          </div>
          {mode === 'add' && valid && (
            <p className="text-sm text-muted-foreground">
              New total: <b className="text-foreground">{fmtQty(item.quantityOnHand + n)}{unit}</b>
            </p>
          )}
          <DialogFooter>
            <Button
              type="submit"
              className="h-10 bg-bbq-flame font-display font-bold text-white"
              disabled={!valid || saving}
            >
              {mode === 'add' ? 'Add to stock' : 'Save count'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add / edit a stock item ─────────────────────────────────────────────────

function ItemDialog({
  item,
  onClose,
  onDone,
}: {
  item: PosStockItem | null;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [name, setName] = useState(item?.name ?? '');
  const [unit, setUnit] = useState(item?.unit ?? 'pc');
  const [counted, setCounted] = useState(item?.isCountable ?? true);
  const [qty, setQty] = useState('0');
  const [lowAt, setLowAt] = useState(
    item?.lowStockThreshold != null ? String(item.lowStockThreshold) : '',
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) {
      toast.error('Give it a name');
      return;
    }
    const low = lowAt.trim() ? Number(lowAt) : null;
    if (low !== null && (!Number.isFinite(low) || low < 0)) {
      toast.error('The warning level must be 0 or more');
      return;
    }
    const start = Number(qty);
    if (!item && (!Number.isFinite(start) || start < 0)) {
      toast.error('The starting count must be 0 or more');
      return;
    }
    setSaving(true);
    try {
      if (item) {
        await posInventoryService.updateItem(item.id, {
          name: name.trim(),
          unit: unit.trim(),
          isCountable: counted,
          lowStockThreshold: low,
        });
        toast.success('Saved');
      } else {
        await posInventoryService.createItem({
          name: name.trim(),
          unit: unit.trim() || undefined,
          isCountable: counted,
          quantityOnHand: counted ? start : 0,
          lowStockThreshold: low ?? undefined,
        });
        toast.success(`${name.trim()} added`);
      }
      await onDone();
    } catch (e) {
      toast.error(errorText(e, 'Could not save'));
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="content-start">
        <DialogHeader>
          <DialogTitle className="font-display">
            {item ? `Edit ${item.name}` : 'New stock item'}
          </DialogTitle>
          {item && (
            <DialogDescription>
              To change how many you have, use Restock or Count on the list.
            </DialogDescription>
          )}
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div>
            <Label htmlFor="stock-name">Name</Label>
            <Input
              id="stock-name"
              className="mt-1 h-10"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Chicken leg"
            />
          </div>
          <div>
            <Label htmlFor="stock-unit">Counted in</Label>
            <Input
              id="stock-unit"
              className="mt-1 h-10"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="pc, kg, pack"
            />
          </div>
          {counted && !item && (
            <div>
              <Label htmlFor="stock-qty">How many do you have now?</Label>
              <Input
                id="stock-qty"
                className="mt-1 h-10"
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </div>
          )}
          {counted && (
            <div>
              <Label htmlFor="stock-low">Warn me when it drops to (optional)</Label>
              <Input
                id="stock-low"
                className="mt-1 h-10"
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={lowAt}
                onChange={(e) => setLowAt(e.target.value)}
                placeholder="10"
              />
            </div>
          )}
          <label className="flex items-start gap-2 rounded-xl border p-3">
            <Checkbox
              checked={counted}
              onCheckedChange={(v) => setCounted(v === true)}
              className="mt-0.5"
            />
            <span className="text-sm">
              <b className="font-display">Count this item</b>
              <span className="block text-muted-foreground">
                Stock goes down when cooking starts, and menu items sell out when it runs
                out. Untick for things you do not count, like sauces.
              </span>
            </span>
          </label>
          <DialogFooter>
            <Button
              type="submit"
              className="h-10 bg-bbq-flame font-display font-bold text-white"
              disabled={saving}
            >
              {item ? 'Save' : 'Add item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Stock used by one menu item ─────────────────────────────────────────────

type RecipeRow = { inventoryItemId: string; quantityPerUnit: string };

function RecipeDialog({
  product,
  items,
  onClose,
  onDone,
}: {
  product: ProductRow;
  items: PosStockItem[];
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [rows, setRows] = useState<RecipeRow[]>(() =>
    product.recipe.map((r) => ({
      inventoryItemId: r.inventoryItemId,
      quantityPerUnit: String(r.quantityPerUnit),
    })),
  );
  const [saving, setSaving] = useState(false);
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const unused = items.filter((i) => !rows.some((r) => r.inventoryItemId === i.id));

  async function save() {
    const ingredients = rows
      .map((r) => ({ inventoryItemId: r.inventoryItemId, quantityPerUnit: Number(r.quantityPerUnit) }))
      .filter((r) => r.inventoryItemId && Number.isFinite(r.quantityPerUnit) && r.quantityPerUnit > 0);
    setSaving(true);
    try {
      await posInventoryService.setProductIngredients(product.id, ingredients);
      toast.success(`Saved stock for ${product.name}`);
      await onDone();
    } catch (e) {
      toast.error(errorText(e, 'Could not save'));
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="content-start">
        <DialogHeader>
          <DialogTitle className="font-display">Stock used by {product.name}</DialogTitle>
          <DialogDescription>
            What one order of {product.name} uses. When any of these runs out, it shows as
            sold out on the till.
          </DialogDescription>
        </DialogHeader>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Add stock items on the Stock tab first.
          </p>
        ) : (
          <div className="space-y-2">
            {rows.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nothing linked. {product.name} stays on sale until you switch it off.
              </p>
            )}
            {rows.map((row, index) => {
              const picked = byId.get(row.inventoryItemId);
              const choices = items.filter(
                (i) => i.id === row.inventoryItemId || !rows.some((r) => r.inventoryItemId === i.id),
              );
              return (
                <div key={index} className="flex items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <Label className="text-xs">Stock item</Label>
                    <Select
                      value={row.inventoryItemId}
                      onValueChange={(v) => {
                        if (!v) return;
                        setRows((prev) =>
                          prev.map((r, i) => (i === index ? { ...r, inventoryItemId: String(v) } : r)),
                        );
                      }}
                    >
                      <SelectTrigger className="mt-1 h-10 w-full">
                        <SelectValue>{picked?.name ?? 'Pick one'}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {choices.map((it) => (
                          <SelectItem key={it.id} value={it.id}>
                            {it.name}
                            {!it.isCountable ? ' (not counted)' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-24">
                    <Label className="text-xs">Per order</Label>
                    <Input
                      className="mt-1 h-10"
                      type="number"
                      inputMode="decimal"
                      min={0.01}
                      step="any"
                      value={row.quantityPerUnit}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((r, i) => (i === index ? { ...r, quantityPerUnit: e.target.value } : r)),
                        )
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-10 text-destructive"
                    aria-label={`Take ${picked?.name ?? 'this'} out`}
                    onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
            <Button
              type="button"
              variant="outline"
              className="h-10 font-display"
              disabled={unused.length === 0}
              onClick={() =>
                unused[0] &&
                setRows((prev) => [...prev, { inventoryItemId: unused[0].id, quantityPerUnit: '1' }])
              }
            >
              <Plus className="mr-1 h-4 w-4" />
              Add a stock item
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            className="h-10 bg-bbq-flame font-display font-bold text-white"
            onClick={() => void save()}
            disabled={saving || items.length === 0}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
