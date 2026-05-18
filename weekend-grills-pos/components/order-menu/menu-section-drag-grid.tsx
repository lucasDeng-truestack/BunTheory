'use client';

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import type { PosMenuItem } from '@/types/pos';
import { MenuItemCard } from '@/components/order-menu/menu-item-card';
import { SortableMenuItemCard } from '@/components/order-menu/sortable-menu-item-card';

interface MenuSectionDragGridProps {
  sectionIndex: number;
  title: string;
  subtitle: string | null;
  items: PosMenuItem[];
  menuEditMode: boolean;
  onReorder: (sectionIndex: number, reordered: PosMenuItem[]) => void;
  onTapAdd: (item: PosMenuItem) => void;
  onEdit: (item: PosMenuItem) => void;
  onDelete: (item: PosMenuItem) => void;
}

const GRID_ROW =
  'grid grid-cols-2 gap-4 min-[768px]:grid-cols-2 min-[768px]:gap-5 lg:grid-cols-3 xl:grid-cols-4';

export function MenuSectionDragGrid({
  sectionIndex,
  title,
  subtitle,
  items,
  menuEditMode,
  onReorder,
  onTapAdd,
  onEdit,
  onDelete,
}: MenuSectionDragGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 10 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(e: DragEndEvent) {
    if (!menuEditMode) return;
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const ids = items.map((i) => i.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;

    onReorder(sectionIndex, arrayMove(items, oldIndex, newIndex));
  }

  function renderCards() {
    return items.map((item) =>
      menuEditMode ? (
        <SortableMenuItemCard
          key={item.id}
          item={item}
          editMode
          onAdd={onTapAdd}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ) : (
        <MenuItemCard
          key={item.id}
          item={item}
          editMode={false}
          onAdd={onTapAdd}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ),
    );
  }

  return (
    <section>
      <div className="mb-3">
        <div className="flex flex-wrap items-baseline gap-2">
          <h2 className="font-display text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {title}
          </h2>
          {menuEditMode ? (
            <span className="rounded-full bg-muted px-2 py-0.5 font-display text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              Drag grip to reorder
            </span>
          ) : null}
        </div>
        {subtitle ? (
          <p className="mt-1 text-[11px] text-muted-foreground/90">{subtitle}</p>
        ) : null}
      </div>

      {menuEditMode ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
            <div className={`${GRID_ROW} *:min-h-0 *:min-w-0`}>{renderCards()}</div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className={GRID_ROW}>{renderCards()}</div>
      )}
    </section>
  );
}
