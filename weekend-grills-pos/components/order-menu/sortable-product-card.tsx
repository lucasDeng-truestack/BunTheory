'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import type { PosProduct } from '@/types/pos';
import { ProductCard } from './product-card';
import { cn } from '@/lib/utils';

interface SortableProductCardProps {
  product: PosProduct;
  editMode: boolean;
  onTap: (product: PosProduct) => void;
  onEdit: (product: PosProduct) => void;
  onDelete: (product: PosProduct) => void;
}

export function SortableProductCard({
  product,
  editMode,
  onTap,
  onEdit,
  onDelete,
}: SortableProductCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: product.id, disabled: !editMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn('relative', isDragging && 'z-10')}>
      {editMode ? (
        <button
          type="button"
          className="absolute left-2 top-2 z-20 rounded-md bg-background/90 p-1 shadow-sm"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      ) : null}
      <ProductCard
        product={product}
        editMode={editMode}
        onTap={onTap}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  );
}
