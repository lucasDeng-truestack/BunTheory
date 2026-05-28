import type { PosOrder } from '@/types/pos';

/** Kitchen / ready queues — earliest order first. */
export function sortOrdersOldestFirst(orders: PosOrder[]): PosOrder[] {
  return [...orders].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export function upsertOrderOldestFirst(
  orders: PosOrder[],
  order: PosOrder,
): PosOrder[] {
  return sortOrdersOldestFirst([
    ...orders.filter((o) => o.id !== order.id),
    order,
  ]);
}
