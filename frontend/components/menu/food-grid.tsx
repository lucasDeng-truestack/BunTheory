import { FoodCard } from "./food-card";
import type { MenuItem } from "@/types/menu";

interface FoodGridProps {
  items: MenuItem[];
}

export function FoodGrid({ items }: FoodGridProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-charcoal/70">
        <p className="text-lg">No published menu for this ordering window.</p>
        <p className="mt-2 text-sm">
          When a batch is live, items will appear here — usually a couple of days before pickup.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3 xl:gap-8">
      {items.map((item) => (
        <FoodCard key={item.id} item={item} />
      ))}
    </div>
  );
}
