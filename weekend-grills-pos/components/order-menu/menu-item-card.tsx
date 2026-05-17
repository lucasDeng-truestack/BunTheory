'use client';

import Image from 'next/image';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { PosMenuItem } from '@/types/pos';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MenuItemCardProps {
  item: PosMenuItem;
  editMode?: boolean;
  onAdd: (item: PosMenuItem) => void;
  onEdit?: (item: PosMenuItem) => void;
  onDelete?: (item: PosMenuItem) => void;
}

function kindLabel(kind: PosMenuItem['kind']) {
  if (kind === 'MAIN_MEAL') return 'Main meal';
  if (kind === 'SIDE') return 'Side';
  return 'Drink';
}

export function MenuItemCard({
  item,
  editMode,
  onAdd,
  onEdit,
  onDelete,
}: MenuItemCardProps) {
  const canInteract = item.available || !!editMode;

  function handleCardClick() {
    if (!canInteract) return;
    if (editMode) {
      onEdit?.(item);
      return;
    }
    onAdd(item);
  }

  const sectionLabel =
    item.sectionHeader?.title?.trim() ?? item.sectionHeader?.subtitle?.trim();

  return (
    <Card
      className={cn(
        'group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl',
        'border-border/80 shadow-sm transition-shadow duration-200',
        'hover:shadow-lg hover:ring-2 hover:ring-bbq-flame/25',
        'active:scale-[0.98] md:active:scale-100 md:hover:shadow-lg',
        !item.available && !editMode && 'pointer-events-none opacity-40',
        !canInteract && !editMode && 'pointer-events-none',
      )}
      onClick={handleCardClick}
    >
      {editMode ? (
        <Badge
          variant="secondary"
          className="absolute left-2.5 top-2.5 z-10 font-display text-[11px] uppercase tracking-wide shadow-sm md:left-2 md:top-2 md:text-[10px]"
        >
          {kindLabel(item.kind)}
        </Badge>
      ) : null}

      {!item.available ? (
        <Badge
          variant="outline"
          className="absolute right-2.5 top-2.5 z-10 border-destructive/50 font-display text-[11px] text-destructive shadow-sm md:right-2 md:top-2 md:text-[10px]"
        >
          Off menu
        </Badge>
      ) : null}

      {/* Image — storefront-style 4:3; slightly taller tap targets on phone/tablet */}
      {item.image ? (
        <div className="relative aspect-[5/4] w-full shrink-0 overflow-hidden bg-muted min-[768px]:aspect-[4/3]">
          <Image
            src={item.image}
            alt={item.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 280px"
          />
        </div>
      ) : (
        <div className="flex aspect-[5/4] min-h-[7.5rem] w-full shrink-0 items-center justify-center bg-linear-to-br from-bbq-cream via-accent/30 to-muted min-[768px]:aspect-[4/3] min-[768px]:min-h-0">
          <span className="text-5xl min-[768px]:text-4xl">🍖</span>
        </div>
      )}

      {!editMode && item.available ? (
        <div className="absolute right-2.5 top-2.5 rounded-full bg-bbq-flame p-2 text-white opacity-90 shadow-lg transition-opacity group-hover:opacity-100 md:right-2 md:top-2 md:p-1.5">
          <Plus className="h-[1.125rem] w-[1.125rem] md:h-4 md:w-4" />
        </div>
      ) : null}

      <CardContent className={cn(
        'flex min-h-0 flex-1 flex-col p-4 min-[768px]:p-3',
        editMode && 'pb-16 md:pb-14',
      )}>
        <h3 className="font-display text-[17px] font-bold uppercase leading-snug tracking-tight text-foreground md:text-sm">
          {item.name}
        </h3>
        {sectionLabel ? (
          <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-muted-foreground md:text-[11px]">
            {sectionLabel}
          </p>
        ) : null}
        {!editMode ? (
          <p className="mt-2 text-[12px] text-muted-foreground md:text-[10px]">
            {item.kind === 'MAIN_MEAL'
              ? 'Tap · build meal + sides/drinks'
              : 'Tap to add · remarks in cart'}
          </p>
        ) : item.category ? (
          <div className="mt-1.5">
            <Badge variant="secondary" className="font-display text-[11px] md:text-[10px]">
              {item.category.name}
            </Badge>
          </div>
        ) : null}
        {/* Push price toward bottom — matches customer food-card rhythm */}
        <div className="min-h-0 flex-1" aria-hidden />
        <p className="mt-2 shrink-0 font-display text-xl font-black tabular-nums text-bbq-flame md:text-base">
          RM {item.price.toFixed(2)}
        </p>
      </CardContent>

      {editMode ? (
        <div
          className="absolute bottom-0 left-0 right-0 flex gap-2 border-t border-border/90 bg-card/97 p-2.5 backdrop-blur-[2px]"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="h-12 min-h-12 flex-1 font-display text-sm md:h-9 md:min-h-9 md:text-xs"
            onClick={() => onEdit?.(item)}
          >
            <Pencil className="mr-1.5 h-4 w-4 md:h-3 md:w-3" />
            Edit
          </Button>
          <Button
            type="button"
            size="lg"
            variant="destructive"
            className="h-12 min-h-12 shrink-0 px-4 font-display md:h-9 md:min-h-9 md:px-3"
            onClick={() => onDelete?.(item)}
          >
            <Trash2 className="h-5 w-5 md:h-3.5 md:w-3.5" />
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
