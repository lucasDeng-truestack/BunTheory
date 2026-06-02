import { api } from '@/lib/api';
import { PosInventoryItem, PosProductIngredientLink } from '@/types/pos';

export const posInventoryService = {
  listItems: () => api.get<PosInventoryItem[]>('/pos/inventory/items'),

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
