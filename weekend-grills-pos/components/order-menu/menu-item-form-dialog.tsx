'use client';

import type { CSSProperties, FormEvent, ReactNode } from 'react';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';
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
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { ImagePlus, GripVertical, Pencil, Plus, Trash2, X } from 'lucide-react';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { PosCategory, PosMenuItem, PosMenuItemKind } from '@/types/pos';
import { posMenuService } from '@/services/pos-menu.service';
import { uploadImage } from '@/services/upload.service';
import { cn } from '@/lib/utils';

function resolveKind(categoryName: string): PosMenuItemKind {
  const n = categoryName.toLowerCase();
  if (n.includes('side')) return 'SIDE';
  if (n.includes('drink')) return 'DRINK_ADDON';
  return 'MAIN_MEAL';
}

type PosSectionHeadingRow = {
  id: string;
  title: string;
  subtitle: string | null;
  sortOrder: number;
};

function SortableHeadingCard({
  header,
  editing,
  dndLocked,
  gripLabel,
  children,
}: {
  header: Pick<PosSectionHeadingRow, 'id'>;
  editing: boolean;
  dndLocked: boolean;
  gripLabel: string;
  /** Row body (titles + buttons) when not editing — grip is prefixed when not locked. */
  children: ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: header.id, disabled: dndLocked });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    position: 'relative',
    touchAction: 'none',
    zIndex: isDragging ? 40 : undefined,
    boxShadow: isDragging
      ? '0 14px 28px rgb(15 23 42 / 0.12)'
      : undefined,
  };

  const shellClass =
    'rounded-xl border border-border/90 bg-muted/25 p-3 transition-[box-shadow,transform]' +
    (isDragging
      ? ' scale-[1.02] opacity-95 ring-2 ring-bbq-flame/45'
      : ' shadow-sm');

  return (
    <div ref={setNodeRef} style={style} className={shellClass}>
      {editing ? (
        children
      ) : (
        <div className="flex items-start gap-2">
          <button
            type="button"
            title="Drag to reorder"
            aria-label={gripLabel}
            className="mt-1 flex shrink-0 cursor-grab touch-none rounded-md border border-transparent p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" aria-hidden />
          </button>
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      )}
    </div>
  );
}

interface MenuItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: PosCategory[];
  initialItem: PosMenuItem | null;
  /** Pillar nav selection when opening “Add menu”. */
  defaultCategoryId: string | null;
  onSaved: () => void;
}

export function MenuItemFormDialog({
  open,
  onOpenChange,
  categories,
  initialItem,
  defaultCategoryId,
  onSaved,
}: MenuItemFormDialogProps) {
  const sortedCats = useMemo(
    () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [categories],
  );

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [image, setImage] = useState('');
  const [available, setAvailable] = useState(true);
  const [sortOrder, setSortOrder] = useState('0');
  const [categoryId, setCategoryId] = useState('');
  const [sectionHeaderId, setSectionHeaderId] = useState<string | null>(null);
  const [headers, setHeaders] = useState<
    Array<{ id: string; title: string; subtitle: string | null; sortOrder: number }>
  >([]);
  const [newHdrTitle, setNewHdrTitle] = useState('');
  const [newHdrSubtitle, setNewHdrSubtitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [headersEditMode, setHeadersEditMode] = useState(false);
  const [editingHeaderId, setEditingHeaderId] = useState<string | null>(null);
  const [editHdrTitle, setEditHdrTitle] = useState('');
  const [editHdrSubtitle, setEditHdrSubtitle] = useState('');
  const [headerPendingDelete, setHeaderPendingDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const loadHeaders = useCallback(async (catId: string) => {
    if (!catId) {
      setHeaders([]);
      return;
    }
    try {
      const list = await posMenuService.getSectionHeaders(catId);
      setHeaders(list);
    } catch {
      toast.error('Failed to load subsection headings');
      setHeaders([]);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    if (initialItem) {
      setName(initialItem.name);
      setDescription(initialItem.description ?? '');
      setPrice(String(initialItem.price));
      setImage(initialItem.image ?? '');
      setAvailable(initialItem.available);
      setSortOrder(String(initialItem.sortOrder));
      setCategoryId(initialItem.categoryId ?? sortedCats[0]?.id ?? '');
      setSectionHeaderId(initialItem.sectionHeaderId ?? null);
    } else {
      setName('');
      setDescription('');
      setPrice('');
      setImage('');
      setAvailable(true);
      setSortOrder('0');
      const def =
        defaultCategoryId && sortedCats.some((c) => c.id === defaultCategoryId)
          ? defaultCategoryId
          : sortedCats[0]?.id ?? '';
      setCategoryId(def);
      setSectionHeaderId(null);
    }
    setNewHdrTitle('');
    setNewHdrSubtitle('');
    setHeadersEditMode(false);
    setEditingHeaderId(null);
    setHeaderPendingDelete(null);
  }, [open, initialItem, defaultCategoryId, sortedCats]);

  useEffect(() => {
    if (!open || !categoryId) return;
    void loadHeaders(categoryId);
  }, [open, categoryId, loadHeaders]);

  const selectedCategoryName =
    sortedCats.find((c) => c.id === categoryId)?.name ?? '';

  const sortedHeaders = useMemo(
    () =>
      [...headers].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title),
      ),
    [headers],
  );

  const persistHeaderDragOrder = useCallback(
    async (sortedIds: string[]) => {
      if (!categoryId) return;
      try {
        await Promise.all(
          sortedIds.map((id, index) =>
            posMenuService.updateSectionHeader(id, { sortOrder: index }),
          ),
        );
        await loadHeaders(categoryId);
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : 'Could not save heading order',
        );
        await loadHeaders(categoryId);
      }
    },
    [categoryId, loadHeaders],
  );

  const handleSectionHeaderDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (!categoryId || editingHeaderId) return;
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const ids = sortedHeaders.map((h) => h.id);
      const oldIndex = ids.indexOf(String(active.id));
      const newIndex = ids.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return;
      void persistHeaderDragOrder(arrayMove(ids, oldIndex, newIndex));
    },
    [
      categoryId,
      editingHeaderId,
      sortedHeaders,
      persistHeaderDragOrder,
    ],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  async function handleCreateHeader() {
    if (!categoryId.trim() || !newHdrTitle.trim()) {
      toast.error('Enter a subsection title.');
      return;
    }
    try {
      const created = await posMenuService.createSectionHeader({
        categoryId,
        title: newHdrTitle.trim(),
        subtitle: newHdrSubtitle.trim() || null,
      });
      toast.success('Subsection heading added');
      await loadHeaders(categoryId);
      setSectionHeaderId(created.id);
      setNewHdrTitle('');
      setNewHdrSubtitle('');
    } catch {
      toast.error('Could not add heading');
    }
  }

  function startEditHeader(h: {
    id: string;
    title: string;
    subtitle: string | null;
  }) {
    setEditingHeaderId(h.id);
    setEditHdrTitle(h.title);
    setEditHdrSubtitle(h.subtitle ?? '');
  }

  function cancelEditHeader() {
    setEditingHeaderId(null);
  }

  async function handleSaveHeaderEdit() {
    if (!editingHeaderId || !categoryId) return;
    const titleTrim = editHdrTitle.trim();
    if (!titleTrim) {
      toast.error('Heading title cannot be empty.');
      return;
    }
    try {
      await posMenuService.updateSectionHeader(editingHeaderId, {
        title: titleTrim,
        subtitle: editHdrSubtitle.trim() || null,
      });
      toast.success('Heading updated');
      setEditingHeaderId(null);
      await loadHeaders(categoryId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update heading');
    }
  }

  async function handleConfirmDeleteHeader() {
    const h = headerPendingDelete;
    if (!h || !categoryId) return;
    try {
      await posMenuService.deleteSectionHeader(h.id);
      toast.success(`Removed “${h.title}”`);
      if (sectionHeaderId === h.id) setSectionHeaderId(null);
      if (editingHeaderId === h.id) setEditingHeaderId(null);
      await loadHeaders(categoryId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not delete heading');
    } finally {
      setHeaderPendingDelete(null);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const p = parseFloat(price);
    if (!name.trim() || Number.isNaN(p) || p < 0) {
      toast.error('Enter a name and valid price.');
      return;
    }
    if (!categoryId) {
      toast.error('Pick a pillar category.');
      return;
    }
    setSaving(true);
    try {
      const kind = resolveKind(selectedCategoryName);
      const payload: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim() || undefined,
        price: p,
        image: image.trim() || undefined,
        available,
        categoryId,
        kind,
        sortOrder: parseInt(sortOrder, 10) || 0,
        sectionHeaderId,
      };

      if (initialItem) {
        await posMenuService.updateItem(initialItem.id, payload);
        toast.success('Menu item updated');
      } else {
        await posMenuService.createItem(payload);
        toast.success('Menu item added');
      }
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error('Could not save menu item');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-h-[min(94dvh,900px)] gap-0 overflow-hidden p-0 sm:max-w-xl',
          'border-l-[5px] border-l-bbq-flame bg-popover shadow-2xl ring-1 ring-bbq-flame/10',
        )}
      >
        <form className="flex max-h-[min(94dvh,900px)] flex-col" onSubmit={handleSubmit}>
          {/* Header hero — echoes customer food-card polish (accent + typography) */}
          <div className="relative shrink-0 overflow-hidden border-b border-border/80 bg-linear-to-br from-bbq-cream/90 via-accent/55 to-bbq-teal-light/35 px-5 pt-5 pb-4">
            <div
              className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-bbq-flame/15 blur-2xl"
              aria-hidden
            />
            <DialogHeader className="relative gap-2 pr-8">
              <DialogTitle className="font-display text-xl font-black tracking-tight text-bbq-charcoal">
                {initialItem ? 'Edit menu item' : 'Add menu item'}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-[13px] leading-relaxed">
                Choose pillar & subsection for how it groups on the POS; item name, photo, and price mirror the storefront menu cards.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="grid gap-6">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm ring-1 ring-bbq-flame/6 md:p-5">
              <div className="grid gap-4">
              <div className="grid gap-2">
              <Label className="font-display text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Pillar category
              </Label>
              <Select
                value={categoryId}
                onValueChange={(v) => setCategoryId(v ?? '')}
              >
                <SelectTrigger className="w-full font-display">
                  <span className="flex flex-1 text-left truncate">
                    {sortedCats.find((c) => c.id === categoryId)?.name ??
                      'Select Mains · Sides · Drinks'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {sortedCats.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="font-display">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Menu type ({resolveKind(selectedCategoryName).replace('_', ' ')}) is inferred from pillar name — use “Sides” or “Drinks” so items land in kitchen splits.
              </p>
            </div>

            <div className="grid gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label className="font-display text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Subsection heading
                </Label>
                <Button
                  type="button"
                  variant={headersEditMode ? 'secondary' : 'outline'}
                  size="sm"
                  className="font-display text-xs shrink-0"
                  disabled={!categoryId}
                  onClick={() => {
                    if (headersEditMode) {
                      setEditingHeaderId(null);
                    }
                    setHeadersEditMode((v) => !v);
                  }}
                >
                  {headersEditMode ? 'Done editing' : 'Edit headings'}
                </Button>
              </div>
              <Select
                value={sectionHeaderId ?? '__none__'}
                onValueChange={(v) =>
                  setSectionHeaderId(v === '__none__' ? null : v)
                }
                disabled={!categoryId}
              >
                <SelectTrigger className="w-full font-display">
                  <span className="flex flex-1 text-left truncate">
                    {!categoryId
                      ? 'Pick a pillar first'
                      : headers.length === 0
                        ? 'No headings yet — add one below'
                        : headers.find((h) => h.id === sectionHeaderId)?.title ??
                          'Ungrouped (no heading)'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="font-display">
                    No subsection (shows under defaults)
                  </SelectItem>
                  {sortedHeaders.map((h) => (
                    <SelectItem key={h.id} value={h.id} className="font-display">
                      {h.title}
                      {h.subtitle ? ` — ${h.subtitle}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {headersEditMode && categoryId ? (
                <div className="rounded-xl border border-border bg-muted/15 p-2 space-y-2 max-h-52 overflow-y-auto">
                  {headers.length > 0 ? (
                    <p className="font-display text-[10px] text-muted-foreground px-1">
                      Drag headings by the grip — items animate and swap; order saves when you release.
                    </p>
                  ) : null}
                  {headers.length === 0 ? (
                    <p className="font-display text-xs text-muted-foreground px-1 py-2">
                      No headings for this pillar yet — add one below.
                    </p>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleSectionHeaderDragEnd}
                    >
                      <SortableContext
                        items={sortedHeaders.map((hh) => hh.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-2">
                          {sortedHeaders.map((h) => (
                            <SortableHeadingCard
                              key={h.id}
                              header={{ id: h.id }}
                              editing={editingHeaderId === h.id}
                              dndLocked={!!editingHeaderId}
                              gripLabel={`Drag to reorder ${h.title}`}
                            >
                              {editingHeaderId === h.id ? (
                                <div className="grid gap-2">
                                  <Input
                                    value={editHdrTitle}
                                    onChange={(e) =>
                                      setEditHdrTitle(e.target.value)
                                    }
                                    className="font-display text-sm"
                                    aria-label="Edit heading title"
                                  />
                                  <Input
                                    value={editHdrSubtitle}
                                    onChange={(e) =>
                                      setEditHdrSubtitle(e.target.value)
                                    }
                                    placeholder="Subtitle (optional)"
                                    className="font-display text-xs"
                                  />
                                  <div className="flex flex-wrap justify-end gap-2 pt-1">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="font-display text-xs"
                                      onClick={cancelEditHeader}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      className="font-display text-xs bg-bbq-flame text-white hover:bg-bbq-flame/90"
                                      onClick={() =>
                                        void handleSaveHeaderEdit()
                                      }
                                    >
                                      Save
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-start gap-2">
                                  <div className="min-w-0 flex-1">
                                    <p className="font-display text-sm font-bold leading-tight">
                                      {h.title}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                      {h.subtitle?.trim()
                                        ? h.subtitle
                                        : 'No kitchen subtitle'}
                                    </p>
                                  </div>
                                  <div className="flex shrink-0 gap-1">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon-xs"
                                      className="h-8 w-8 font-display text-bbq-flame border-bbq-flame/30"
                                      title="Edit this heading"
                                      onClick={() => startEditHeader(h)}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="icon-xs"
                                      className="h-8 w-8"
                                      title="Delete this heading"
                                      onClick={() =>
                                        setHeaderPendingDelete({
                                          id: h.id,
                                          title: h.title,
                                        })
                                      }
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </SortableHeadingCard>
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </div>
              ) : null}

              <div className="rounded-xl border border-dashed border-border bg-muted/20 p-3 space-y-2">
                <p className="font-display text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Add heading type (like option groups UX)
                </p>
                <div className="grid gap-2">
                  <Input
                    placeholder="Heading title (e.g. Meal selection)"
                    value={newHdrTitle}
                    onChange={(e) => setNewHdrTitle(e.target.value)}
                    className="font-display text-sm"
                  />
                  <Input
                    placeholder="Subtitle for kitchen hint (optional)"
                    value={newHdrSubtitle}
                    onChange={(e) => setNewHdrSubtitle(e.target.value)}
                    className="font-display text-sm"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="font-display text-xs justify-self-start"
                    onClick={() => void handleCreateHeader()}
                    disabled={!categoryId || !newHdrTitle.trim()}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Save heading
                  </Button>
                </div>
                </div>
              </div>
            </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm ring-1 ring-bbq-flame/6 md:p-5">
              <div className="grid gap-4">
                <div>
                  <p className="font-display text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Item details
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Matches the storefront card: title, optional line, RM price below the photo.
                  </p>
                </div>

                <Separator className="bg-border/90" />

            <div className="grid gap-2">
              <Label htmlFor="mi-name" className="font-display font-semibold">
                Item name
              </Label>
              <Input
                id="mi-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="font-display"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="mi-desc" className="font-display font-semibold">
                Description
              </Label>
              <Textarea
                id="mi-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="font-display text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="mi-price" className="font-display font-semibold">
                  Price (RM)
                </Label>
                <Input
                  id="mi-price"
                  type="number"
                  min={0}
                  step={0.01}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="mi-sort" className="font-display font-semibold">
                  Sort order
                </Label>
                <Input
                  id="mi-sort"
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label className="font-display font-semibold">Image</Label>
              {image ? (
                <div className="relative w-full overflow-hidden rounded-xl border border-border">
                  <Image
                    src={image}
                    alt="Menu item"
                    width={400}
                    height={200}
                    className="h-32 w-full object-cover"
                  />
                  <button
                    type="button"
                    className="absolute top-1.5 right-1.5 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 transition-colors"
                    onClick={() => setImage('')}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="mi-image-upload"
                  className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 py-8 text-muted-foreground transition-colors hover:border-bbq-flame/40 hover:bg-muted/50"
                >
                  <ImagePlus className="h-6 w-6" />
                  <span className="font-display text-xs font-semibold">
                    {uploading ? 'Uploading…' : 'Click to upload image'}
                  </span>
                  <span className="text-[10px]">JPG, PNG or WebP (max 5MB)</span>
                </label>
              )}
              <input
                id="mi-image-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/jpg"
                className="hidden"
                disabled={uploading || saving}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  e.target.value = '';
                  setUploading(true);
                  try {
                    const { url } = await uploadImage(file);
                    setImage(url);
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : 'Upload failed');
                  } finally {
                    setUploading(false);
                  }
                }}
              />
            </div>

            <label className="flex items-center gap-2 rounded-xl border border-border/80 bg-muted/15 px-3 py-2.5">
              <Checkbox
                checked={available}
                onCheckedChange={(v) => setAvailable(Boolean(v))}
              />
              <span className="font-display text-sm font-medium">Available on menu</span>
            </label>
              </div>
            </div>
          </div>
          </div>

          <DialogFooter className="mx-0 mb-0 shrink-0 border-t border-border bg-muted/30 px-5 py-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="font-display border-bbq-flame/35 text-bbq-flame hover:bg-bbq-flame/8 min-h-11 md:min-h-10"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="lg"
              className="font-display min-h-11 bg-bbq-flame text-white hover:bg-bbq-flame/90 md:min-h-10"
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

      <AlertDialog
        open={!!headerPendingDelete}
        onOpenChange={(o) => !o && setHeaderPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              Delete subsection heading?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {headerPendingDelete
                ? `“${headerPendingDelete.title}” will be removed. Menu items that used this heading will move to Ungrouped (no heading).`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-display">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="font-display bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void handleConfirmDeleteHeader()}
            >
              Delete heading
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
