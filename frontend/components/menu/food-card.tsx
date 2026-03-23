"use client";

import Image from "next/image";
import { toast } from "sonner";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCartStore } from "@/store/cart.store";
import type { MenuItem } from "@/types/menu";
import { normalizeMenuSlug } from "@/lib/menu-slug";
import { ShoppingCart } from "lucide-react";

interface FoodCardProps {
  item: MenuItem;
}

export function FoodCard({ item }: FoodCardProps) {
  const addItem = useCartStore((s) => s.addItem);
  const price = typeof item.price === "string" ? parseFloat(item.price) : item.price;

  return (
    <Card className="overflow-hidden transition-shadow duration-200 hover:shadow-elevated">
      <div className="relative aspect-[4/3] bg-charcoal/5">
        {item.image ? (
          <Image
            src={item.image}
            alt={item.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 300px"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-charcoal/30">
            <span className="text-4xl">🍔</span>
          </div>
        )}
        {!item.available && (
          <div className="absolute inset-0 flex items-center justify-center bg-charcoal/60">
            <Badge variant="destructive" className="text-sm px-4 py-1">
              SOLD OUT
            </Badge>
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="text-xl font-semibold text-charcoal">{item.name}</h3>
        {item.description && (
          <p className="mt-1 line-clamp-2 text-base text-charcoal/70">
            {item.description}
          </p>
        )}
        <p className="mt-2 font-bold text-roast-red">RM {price.toFixed(2)}</p>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button
          size="lg"
          className="w-full"
          disabled={!item.available}
          onClick={() => {
            const slug = item.slug ? normalizeMenuSlug(item.slug) : "";
            if (!slug) {
              toast.error("Menu item unavailable", {
                description: "This item is missing its menu slug. Please refresh and try again.",
              });
              return;
            }

            // Slug is stable across re-seeds, so customer carts use it as the source of truth.
            addItem({
              slug,
              name: item.name,
              price,
              image: item.image,
            });
            toast.success("Added to cart", { description: item.name });
          }}
        >
          <ShoppingCart className="mr-2 h-5 w-5" />
          Add to Cart
        </Button>
      </CardFooter>
    </Card>
  );
}
