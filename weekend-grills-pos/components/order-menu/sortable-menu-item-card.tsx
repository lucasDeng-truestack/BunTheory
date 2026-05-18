'use client';

import type { CSSProperties } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { PosMenuItem } from '@/types/pos';
import { cn } from '@/lib/utils';
import { MenuItemCard } from './menu-item-card';

export function SortableMenuItemCard({
  item,
  editMode,
  onAdd,
  onEdit,
  onDelete,
}: {
  item: PosMenuItem;
  editMode: boolean;
  onAdd: (item: PosMenuItem) => void;
  onEdit?: (item: PosMenuItem) => void;
  onDelete?: (item: PosMenuItem) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    disabled: !editMode,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'h-full',
        isDragging &&
          'rounded-2xl opacity-95 ring-2 ring-bbq-flame/45 shadow-2xl',
      )}
    >
      <MenuItemCard
        item={item}
        editMode={editMode}
        onAdd={onAdd}
        onEdit={onEdit}
        onDelete={onDelete}
        dragGrip={editMode ? { attributes, listeners } : undefined}
      />
    </div>
  );
}
