import type { CartItem } from '@/types/pos';

export type CartSegment =
  | { type: 'bundle'; bundleId: string; title: string; lines: CartItem[] }
  | { type: 'single'; item: CartItem };

/** Groups consecutive cart rows that share {@link CartItem.mealBundleId} for display only. */
export function segmentBundledCart(items: CartItem[]): CartSegment[] {
  const segments: CartSegment[] = [];
  let i = 0;
  while (i < items.length) {
    const bid = items[i].mealBundleId;
    if (!bid) {
      segments.push({ type: 'single', item: items[i] });
      i += 1;
      continue;
    }
    const lines: CartItem[] = [];
    while (i < items.length && items[i].mealBundleId === bid) {
      lines.push(items[i]);
      i += 1;
    }
    const mainLine = lines.find((l) => l.mealLineKind === 'MAIN');
    segments.push({
      type: 'bundle',
      bundleId: bid,
      title: mainLine?.name ?? 'Meal combo',
      lines,
    });
  }
  return segments;
}
