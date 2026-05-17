import { api } from '@/lib/api';
import { InventoryItem, InventoryPurchase } from '@/types/pos';

export const posInventoryService = {
  getItems: () => api.get<InventoryItem[]>('/pos/inventory/items'),
  getItem: (id: string) => api.get<InventoryItem>(`/pos/inventory/items/${id}`),
  createItem: (data: unknown) => api.post<InventoryItem>('/pos/inventory/items', data),
  updateItem: (id: string, data: unknown) =>
    api.patch<InventoryItem>(`/pos/inventory/items/${id}`, data),
  deleteItem: (id: string) => api.delete<void>(`/pos/inventory/items/${id}`),

  getPurchases: (itemId?: string) => {
    const qs = itemId ? `?itemId=${itemId}` : '';
    return api.get<InventoryPurchase[]>(`/pos/inventory/purchases${qs}`);
  },
  createPurchase: (data: unknown) =>
    api.post<InventoryItem>('/pos/inventory/purchases', data),

  getMovements: (itemId?: string) => {
    const qs = itemId ? `?itemId=${itemId}` : '';
    return api.get<unknown[]>(`/pos/inventory/movements${qs}`);
  },

  getRecipe: (menuItemId: string) =>
    api.get<unknown[]>(`/pos/inventory/recipes/${menuItemId}`),
  setRecipeIngredient: (menuItemId: string, data: unknown) =>
    api.post<unknown>(`/pos/inventory/recipes/${menuItemId}`, data),
  deleteRecipeIngredient: (menuItemId: string, inventoryItemId: string) =>
    api.delete<void>(`/pos/inventory/recipes/${menuItemId}/${inventoryItemId}`),
};
