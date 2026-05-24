import { create } from 'zustand';
import { CartItem, PosPaymentMethod, PosServiceType } from '@/types/pos';

interface CartState {
  items: CartItem[];
  customerName: string;
  serviceType: PosServiceType;
  paymentMethod: PosPaymentMethod;
  notes: string;

  addLine: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
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

  addLine: (item) => {
    const id = `${item.productId}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    set((state) => ({
      items: [...state.items, { ...item, id }],
    }));
  },

  removeItem: (id) =>
    set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

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
