import { create } from 'zustand';
import { CartItem, PosPaymentMethod, PosServiceType } from '@/types/pos';

export type CartDiscountPercent = 0 | 5 | 10;

interface CartState {
  items: CartItem[];
  customerName: string;
  serviceType: PosServiceType;
  paymentMethod: PosPaymentMethod;
  notes: string;
  discountPercent: CartDiscountPercent;

  addLine: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updateRemarks: (id: string, remarks: string) => void;
  setCustomerName: (name: string) => void;
  setServiceType: (type: PosServiceType) => void;
  setPaymentMethod: (method: PosPaymentMethod) => void;
  setNotes: (notes: string) => void;
  setDiscountPercent: (percent: CartDiscountPercent) => void;
  clearCart: () => void;
  total: () => number;
  discountAmount: () => number;
  payableTotal: () => number;
  itemCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customerName: '',
  serviceType: 'EAT_HERE',
  paymentMethod: 'CASH',
  notes: '',
  discountPercent: 0,

  addLine: (item) => {
    const id = `${item.productId}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    set((state) => ({
      items: [...state.items, { ...item, id }],
    }));
  },

  removeItem: (id) =>
    set((state) => {
      const items = state.items.filter((i) => i.id !== id);
      return {
        items,
        discountPercent: items.length === 0 ? 0 : state.discountPercent,
      };
    }),

  updateQuantity: (id, quantity) =>
    set((state) => {
      const items =
        quantity <= 0
          ? state.items.filter((i) => i.id !== id)
          : state.items.map((i) => (i.id === id ? { ...i, quantity } : i));
      return {
        items,
        discountPercent: items.length === 0 ? 0 : state.discountPercent,
      };
    }),

  updateRemarks: (id, remarks) =>
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? { ...i, remarks } : i)),
    })),

  setCustomerName: (name) => set({ customerName: name }),
  setServiceType: (type) => set({ serviceType: type }),
  setPaymentMethod: (method) => set({ paymentMethod: method }),
  setNotes: (notes) => set({ notes }),

  setDiscountPercent: (percent) => set({ discountPercent: percent }),

  clearCart: () =>
    set({
      items: [],
      customerName: '',
      serviceType: 'EAT_HERE',
      paymentMethod: 'CASH',
      notes: '',
      discountPercent: 0,
    }),

  total: () =>
    get().items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    ),

  discountAmount: () => {
    const subtotal = get().total();
    const pct = get().discountPercent;
    if (pct <= 0) return 0;
    return Math.round(subtotal * pct) / 100;
  },

  payableTotal: () => {
    const subtotal = get().total();
    const discount = get().discountAmount();
    return Math.round((subtotal - discount) * 100) / 100;
  },

  itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
}));
