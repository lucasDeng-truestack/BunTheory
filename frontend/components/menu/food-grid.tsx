import { FoodCard } from "./food-card";
import type { MenuItem } from "@/types/menu";

interface FoodGridProps {
  items: MenuItem[];
}

export function FoodGrid({ items }: FoodGridProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-charcoal/70">
        <p className="text-lg">No menu items available today.</p>
        <p className="text-sm mt-2">Check back later!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <FoodCard key={item.id} item={item} />
      ))}
    </div>
  );
}
