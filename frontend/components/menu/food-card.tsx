"use client";

import Image from "next/image";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { MenuItem } from "@/types/menu";
import { ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";

interface FoodCardProps {
  item: MenuItem;
  onOpen: (item: MenuItem) => void;
}

export function FoodCard({ item, onOpen }: FoodCardProps) {
  const price = typeof item.price === "string" ? parseFloat(item.price) : item.price;
  const disabled = item.soldOut || !item.available;

  const open = () => {
    if (!disabled) onOpen(item);
  };

  return (
    <Card
      className={cn(
        "flex h-full flex-col overflow-hidden transition-shadow duration-200",
        disabled ? "opacity-80" : "hover:shadow-elevated"
      )}
    >
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        className={cn(
          "flex min-h-0 flex-1 flex-col text-left outline-none",
          disabled ? "cursor-not-allowed" : "cursor-pointer focus-visible:ring-2 focus-visible:ring-roast-red/40"
        )}
        onClick={open}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            open();
          }
        }}
      >
        <div className="relative aspect-[4/3] shrink-0 bg-charcoal/5">
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
          {item.soldOut && (
            <div className="absolute inset-0 flex items-center justify-center bg-charcoal/55">
              <Badge variant="secondary" className="text-sm px-4 py-1 font-display">
                Sold Out
              </Badge>
            </div>
          )}
          {!item.available && !item.soldOut && (
            <div className="absolute inset-0 flex items-center justify-center bg-charcoal/50">
              <Badge variant="destructive" className="text-sm px-4 py-1 font-display">
                Unavailable
              </Badge>
            </div>
          )}
        </div>
        <CardContent className="flex flex-1 flex-col p-4">
          <h3 className="text-xl font-semibold text-charcoal font-display">
            {item.name}
          </h3>
          {item.description ? (
            <p className="mt-1 line-clamp-2 text-base text-charcoal/70">
              {item.description}
            </p>
          ) : null}
          {/* Fills space so price + footer button align across cards with varying description height */}
          <div className="min-h-0 flex-1" aria-hidden />
          <p className="mt-2 shrink-0 font-bold text-roast-red">
            RM {price.toFixed(2)}
          </p>
        </CardContent>
      </div>
      <CardFooter className="mt-auto shrink-0 p-4 pt-0">
        <Button
          size="lg"
          className="w-full font-display"
          disabled={disabled}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            open();
          }}
        >
          <ShoppingCart className="mr-2 h-5 w-5" />
          {item.soldOut ? "Sold out" : !item.available ? "Unavailable" : "Choose options"}
        </Button>
      </CardFooter>
    </Card>
  );
}
