import type { MenuItem } from "@/types/menu";
import { cn } from "@/lib/utils";
import { MenuHighlightCard } from "@/components/menu/menu-highlight-card";

interface MenuHighlightsProps {
  items: MenuItem[];
  className?: string;
  featuredOnly?: boolean;
  /** When false, cards are not links (avoids “order twice” confusion on the landing page). */
  linkItemsToMenu?: boolean;
  title?: string;
  eyebrow?: string;
  description?: string;
  limit?: number;
  gridClassName?: string;
}

export function MenuHighlights({
  items,
  className,
  featuredOnly = false,
  linkItemsToMenu = true,
  title = "Crowd Favorites",
  eyebrow = "Our Menu",
  description,
  limit = 6,
  gridClassName,
}: MenuHighlightsProps) {
  const availableWithImages = items.filter((i) => i.available && i.image);
  const favorites = availableWithImages.filter((i) => i.isFavorite);
  const highlights = featuredOnly
    ? favorites.slice(0, limit)
    : [...favorites, ...availableWithImages.filter((i) => !i.isFavorite)].slice(
        0,
        limit
      );

  if (highlights.length === 0) return null;

  return (
    <section className={cn(className)} aria-labelledby="highlights-heading">
      <div className="mb-8 text-center lg:mb-10">
        <p className="text-xs font-semibold uppercase tracking-eyebrow text-bun-red-deep">
          {eyebrow}
        </p>
        <h2
          id="highlights-heading"
          className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl"
        >
          {title}
        </h2>
        {description ? (
          <p className="mx-auto mt-3 max-w-2xl text-pretty text-ink-soft lg:text-lg">
            {description}
          </p>
        ) : null}
      </div>

      <div
        className={cn(
          "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6",
          gridClassName
        )}
      >
        {highlights.map((item) => {
          const price =
            typeof item.price === "string"
              ? parseFloat(item.price)
              : item.price;

          return (
            <MenuHighlightCard
              key={item.id}
              href={linkItemsToMenu ? "/menu" : undefined}
              name={item.name}
              description={item.description}
              image={item.image!}
              price={price}
            />
          );
        })}
      </div>
    </section>
  );
}
