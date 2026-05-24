import { api } from '@/lib/api';
import { PosMenuSection, PosProduct } from '@/types/pos';

export const posMenuService = {
  getMenu: (availableOnly = true) =>
    api.get<PosMenuSection[]>(
      `/pos/menu${availableOnly ? '?available=true' : ''}`,
    ),

  createSection: (data: { name: string; sortOrder?: number }) =>
    api.post<{ id: string; name: string; sortOrder: number }>(
      '/pos/menu/sections',
      data,
    ),

  updateSection: (
    id: string,
    data: { name?: string; sortOrder?: number },
  ) => api.patch(`/pos/menu/sections/${id}`, data),

  deleteSection: (id: string) => api.delete<void>(`/pos/menu/sections/${id}`),

  getProduct: (id: string) => api.get<PosProduct>(`/pos/menu/products/${id}`),

  createProduct: (data: unknown) =>
    api.post<PosProduct>('/pos/menu/products', data),

  updateProduct: (id: string, data: unknown) =>
    api.patch<PosProduct>(`/pos/menu/products/${id}`, data),

  deleteProduct: (id: string) => api.delete<void>(`/pos/menu/products/${id}`),

  reorderProducts: (sectionId: string, productIds: string[]) =>
    api.patch<PosMenuSection[]>('/pos/menu/products/reorder', {
      sectionId,
      productIds,
    }),
};
