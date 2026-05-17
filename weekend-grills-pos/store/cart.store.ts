import { create } from 'zustand';
import { CartItem, PosMenuItem, PosPaymentMethod, PosServiceType } from '@/types/pos';

export interface MealExtraSelection {
  item: PosMenuItem;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  customerName: string;
  serviceType: PosServiceType;
  paymentMethod: PosPaymentMethod;
  notes: string;

  addItem: (item: Omit<CartItem, 'id'>) => void;
  addMealBundle: (payload: {
    main: PosMenuItem;
    mainQuantity: number;
    mainRemarks: string;
    extras: MealExtraSelection[];
  }) => void;
  removeItem: (id: string) => void;
  removeMealBundle: (bundleId: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updateRemarks: (id: string, remarks: string) => void;
  setCustomerName: (name: string) => void;
  setServiceType: (type: PosServiceType) => void;
  setPaymentMethod: (method: PosPaymentMethod) => void;
  setNotes: (notes: string) => void;
  clearCart: () => void;
  total: () => number;
  itemCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customerName: '',
  serviceType: 'EAT_HERE',
  paymentMethod: 'CASH',
  notes: '',

  addItem: (item) => {
    const id = `${item.menuItemId}-${Date.now()}-${Math.random()}`;
    set((state) => ({
      items: [...state.items, { ...item, id }],
    }));
  },

  addMealBundle: ({ main, mainQuantity, mainRemarks, extras }) => {
    const mq = Math.max(1, Math.floor(mainQuantity || 1));
    const mealBundleId = `meal-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

    const toCartLine = (
      line: Omit<CartItem, 'id'>,
    ): CartItem => ({
      ...line,
      id: `${line.menuItemId}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    });

    const mainLine = toCartLine({
      menuItemId: main.id,
      name: main.name,
      description: main.description,
      image: main.image,
      quantity: mq,
      unitPrice: main.price,
      remarks: mainRemarks.trim(),
      mealBundleId,
      mealLineKind: 'MAIN',
    });

    const extraLines: CartItem[] = extras
      .filter((x) => x.quantity > 0)
      .map((x) =>
        toCartLine({
          menuItemId: x.item.id,
          name: x.item.name,
          description: x.item.description,
          image: x.item.image,
          quantity: x.quantity,
          unitPrice: x.item.price,
          remarks: '',
          mealBundleId,
          mealLineKind: x.item.kind === 'SIDE' ? 'SIDE' : 'DRINK_ADDON',
        }),
      );

    set((state) => ({
      items: [...state.items, mainLine, ...extraLines],
    }));
  },

  removeItem: (id) =>
    set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

  removeMealBundle: (bundleId) =>
    set((state) => ({
      items: state.items.filter((i) => i.mealBundleId !== bundleId),
    })),

  updateQuantity: (id, quantity) =>
    set((state) => ({
      items:
        quantity <= 0
          ? state.items.filter((i) => i.id !== id)
          : state.items.map((i) => (i.id === id ? { ...i, quantity } : i)),
    })),

  updateRemarks: (id, remarks) =>
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? { ...i, remarks } : i)),
    })),

  setCustomerName: (name) => set({ customerName: name }),
  setServiceType: (type) => set({ serviceType: type }),
  setPaymentMethod: (method) => set({ paymentMethod: method }),
  setNotes: (notes) => set({ notes }),

  clearCart: () =>
    set({
      items: [],
      customerName: '',
      serviceType: 'EAT_HERE',
      paymentMethod: 'CASH',
      notes: '',
    }),

  total: () =>
    get().items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    ),

  itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
}));
