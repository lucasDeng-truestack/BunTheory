import { create } from 'zustand';
import { isJwtExpired } from '@/lib/jwt-utils';

export interface Admin {
  id: string;
  email: string;
  displayName?: string | null;
}

interface AuthState {
  token: string | null;
  admin: Admin | null;
  isAuthenticated: boolean;
  hydrated: boolean;
  login: (token: string, admin: Admin) => void;
  mergeAdmin: (patch: Partial<Pick<Admin, 'email' | 'displayName'>>) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  admin: null,
  isAuthenticated: false,
  hydrated: false,

  login: (token, admin) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('pos_token', token);
      localStorage.setItem('pos_admin', JSON.stringify(admin));
    }
    set({ token, admin, isAuthenticated: true, hydrated: true });
  },

  mergeAdmin: (patch) =>
    set((state) => {
      if (!state.admin) return state;
      const admin = { ...state.admin, ...patch };
      if (typeof window !== 'undefined') {
        localStorage.setItem('pos_admin', JSON.stringify(admin));
      }
      return { admin };
    }),

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pos_token');
      localStorage.removeItem('pos_admin');
    }
    set({ token: null, admin: null, isAuthenticated: false });
  },

  hydrate: () => {
    if (typeof window === 'undefined') return;
    if (get().hydrated) return;
    const token = localStorage.getItem('pos_token');
    const adminRaw = localStorage.getItem('pos_admin');
    if (token && adminRaw) {
      if (isJwtExpired(token)) {
        localStorage.removeItem('pos_token');
        localStorage.removeItem('pos_admin');
        set({ hydrated: true });
        return;
      }
      try {
        const admin = JSON.parse(adminRaw) as Admin;
        set({ token, admin, isAuthenticated: true, hydrated: true });
      } catch {
        localStorage.removeItem('pos_token');
        localStorage.removeItem('pos_admin');
        set({ hydrated: true });
      }
    } else {
      set({ hydrated: true });
    }
  },
}));
