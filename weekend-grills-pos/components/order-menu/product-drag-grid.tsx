'use client';

import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import type { PosProduct } from '@/types/pos';
import { SortableProductCard } from './sortable-product-card';

interface ProductDragGridProps {
  products: PosProduct[];
  editMode: boolean;
  onReorder: (reordered: PosProduct[]) => void;
  onTap: (product: PosProduct) => void;
  onEdit: (product: PosProduct) => void;
  onDelete: (product: PosProduct) => void;
}

export function ProductDragGrid({
  products,
  editMode,
  onReorder,
  onTap,
  onEdit,
  onDelete,
}: ProductDragGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = products.findIndex((p) => p.id === active.id);
    const newIndex = products.findIndex((p) => p.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(products, oldIndex, newIndex));
  }

  if (!editMode) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <SortableProductCard
            key={product.id}
            product={product}
            editMode={false}
            onTap={onTap}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={products.map((p) => p.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <SortableProductCard
              key={product.id}
              product={product}
              editMode
              onTap={onTap}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
