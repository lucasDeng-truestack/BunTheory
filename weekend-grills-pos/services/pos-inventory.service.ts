import { api } from '@/lib/api';
import {
  PosInventoryItem,
  PosProductIngredientLink,
  PosStockOverview,
} from '@/types/pos';

export const posInventoryService = {
  listItems: () => api.get<PosInventoryItem[]>('/pos/inventory/items'),

  /** Menu items with servings left and recipes, plus stock items with what uses them. */
  getOverview: () => api.get<PosStockOverview>('/pos/inventory/overview'),

  /** "add" a positive or negative amount, or "set" the counted total. Recorded on the server. */
  adjustStock: (id: string, body: { mode?: 'add' | 'set'; amount: number }) =>
    api.post<PosInventoryItem>(`/pos/inventory/items/${id}/adjust`, body),

  createItem: (body: {
    name: string;
    unit?: string;
    isCountable?: boolean;
    quantityOnHand?: number;
    lowStockThreshold?: number;
    sortOrder?: number;
  }) => api.post<PosInventoryItem>('/pos/inventory/items', body),

  updateItem: (
    id: string,
    body: Partial<{
      name: string;
      unit: string;
      isCountable: boolean;
      quantityOnHand: number;
      lowStockThreshold: number | null;
      sortOrder: number;
    }>,
  ) => api.patch<PosInventoryItem>(`/pos/inventory/items/${id}`, body),

  deleteItem: (id: string) =>
    api.delete<{ ok: boolean }>(`/pos/inventory/items/${id}`),

  getProductIngredients: (productId: string) =>
    api.get<PosProductIngredientLink[]>(
      `/pos/inventory/products/${productId}/ingredients`,
    ),

  setProductIngredients: (
    productId: string,
    ingredients: Array<{ inventoryItemId: string; quantityPerUnit: number }>,
  ) =>
    api.put<PosProductIngredientLink[]>(
      `/pos/inventory/products/${productId}/ingredients`,
      { ingredients },
    ),
};
