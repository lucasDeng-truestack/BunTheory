import { FoodCard } from "./food-card";
import type { MenuItem } from "@/types/menu";

interface FoodGridProps {
  items: MenuItem[];
  onOpenItem: (item: MenuItem) => void;
  /** Quick-add handler wired to the fly-to-cart animation. */
  onAddItem?: (item: MenuItem, rect: DOMRect) => void;
  /** Eager-load the first card's image (use on the first section only). */
  priorityFirst?: boolean;
}

export function FoodGrid({ items, onOpenItem, onAddItem, priorityFirst }: FoodGridProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-ink-soft">
        <p className="text-lg">No menu items yet.</p>
        <p className="mt-2 text-sm">
          When the kitchen adds items, they will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3 xl:gap-8">
      {items.map((item, i) => (
        <FoodCard
          key={item.id}
          item={item}
          onOpen={onOpenItem}
          onAdd={onAddItem}
          priority={priorityFirst && i === 0}
        />
      ))}
    </div>
  );
}
