import { api } from '@/lib/api';

export interface ListedAdmin {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: string;
}

export const adminsService = {
  list: () => api.get<ListedAdmin[]>('/auth/admins'),

  create: (body: {
    email: string;
    password: string;
    displayName?: string;
  }) => api.post<ListedAdmin>('/auth/admins', body),

  updateDisplayName: (id: string, displayName: string) =>
    api.patch<ListedAdmin>(`/auth/admins/${id}/display-name`, {
      displayName,
    }),
};
