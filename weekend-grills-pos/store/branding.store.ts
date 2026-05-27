import { create } from 'zustand';
import { posSettingsService } from '@/services/settings.service';

export const DEFAULT_COMPANY_NAME = 'The Weekend Grillers';

const STORAGE_KEY = 'pos_branding';

interface CachedBranding {
  companyName: string;
  companyLogoUrl: string | null;
}

interface BrandingState extends CachedBranding {
  hydrated: boolean;
  hydrateFromStorage: () => void;
  setBranding: (companyName: string, companyLogoUrl: string | null) => void;
  refresh: () => Promise<void>;
}

function readStorage(): CachedBranding | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedBranding>;
    return {
      companyName: parsed.companyName?.trim() || DEFAULT_COMPANY_NAME,
      companyLogoUrl: parsed.companyLogoUrl ?? null,
    };
  } catch {
    return null;
  }
}

function writeStorage(companyName: string, companyLogoUrl: string | null) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ companyName, companyLogoUrl }),
  );
}

function initialBranding(): CachedBranding & { hydrated: boolean } {
  const cached = readStorage();
  if (cached) {
    return { ...cached, hydrated: true };
  }
  return {
    companyName: DEFAULT_COMPANY_NAME,
    companyLogoUrl: null,
    hydrated: false,
  };
}

export const useBrandingStore = create<BrandingState>((set, get) => ({
  ...initialBranding(),

  hydrateFromStorage: () => {
    const cached = readStorage();
    if (!cached) {
      set({ hydrated: true });
      return;
    }
    set({
      companyName: cached.companyName,
      companyLogoUrl: cached.companyLogoUrl,
      hydrated: true,
    });
  },

  setBranding: (companyName, companyLogoUrl) => {
    writeStorage(companyName, companyLogoUrl);
    set({ companyName, companyLogoUrl, hydrated: true });
  },

  refresh: async () => {
    try {
      const s = await posSettingsService.getSettings();
      const companyName = s.companyName?.trim() || DEFAULT_COMPANY_NAME;
      const companyLogoUrl = s.companyLogoUrl ?? null;
      writeStorage(companyName, companyLogoUrl);
      set({ companyName, companyLogoUrl, hydrated: true });
    } catch {
      if (!get().hydrated) {
        set({
          companyName: DEFAULT_COMPANY_NAME,
          companyLogoUrl: null,
          hydrated: true,
        });
      }
    }
  },
}));

/** Call after settings save so all mounted shells stay in sync. */
export function syncBrandingFromSettings(
  companyName: string,
  companyLogoUrl: string | null,
) {
  useBrandingStore.getState().setBranding(companyName, companyLogoUrl);
  window.dispatchEvent(new CustomEvent('pos-branding-updated'));
}
