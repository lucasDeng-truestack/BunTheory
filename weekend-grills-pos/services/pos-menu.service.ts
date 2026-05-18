import { api } from '@/lib/api';
import { PosCategory, PosMenuItem, PosMenuSectionHeader } from '@/types/pos';

export const posMenuService = {
  getCategories: () => api.get<PosCategory[]>('/pos/menu/categories'),

  createCategory: (data: { name: string; sortOrder?: number }) =>
    api.post<PosCategory>('/pos/menu/categories', data),

  deleteCategory: (id: string) => api.delete<void>(`/pos/menu/categories/${id}`),

  getSectionHeaders: (categoryId: string) =>
    api.get<PosMenuSectionHeader[]>(
      `/pos/menu/categories/${categoryId}/section-headers`,
    ),

  createSectionHeader: (data: {
    categoryId: string;
    title: string;
    subtitle?: string | null;
    sortOrder?: number;
  }) => api.post<PosMenuSectionHeader>('/pos/menu/section-headers', data),

  updateSectionHeader: (
    id: string,
    data: { title?: string; subtitle?: string | null; sortOrder?: number },
  ) => api.patch<PosMenuSectionHeader>(`/pos/menu/section-headers/${id}`, data),

  deleteSectionHeader: (id: string) =>
    api.delete<void>(`/pos/menu/section-headers/${id}`),

  getItems: (availableOnly = true) =>
    api.get<PosMenuItem[]>(`/pos/menu/items${availableOnly ? '?available=true' : ''}`),

  getItem: (id: string) => api.get<PosMenuItem>(`/pos/menu/items/${id}`),

  createItem: (data: unknown) => api.post<PosMenuItem>('/pos/menu/items', data),

  updateItem: (id: string, data: unknown) =>
    api.patch<PosMenuItem>(`/pos/menu/items/${id}`, data),

  deleteItem: (id: string) => api.delete<void>(`/pos/menu/items/${id}`),
};
