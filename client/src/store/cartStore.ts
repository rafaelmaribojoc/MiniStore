import { create } from "zustand";

interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  price: number;
  stockQuantity: number;
}

interface CartItem {
  product: Product;
  quantity: number;
  discount: number;
}

interface CartState {
  items: CartItem[];
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateDiscount: (productId: string, discount: number) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getTotal: (discount?: number) => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  addItem: (product: Product, quantity = 1) => {
    const { items } = get();
    const existingItem = items.find((item) => item.product.id === product.id);

    if (existingItem) {
      // Check stock
      if (existingItem.quantity + quantity > product.stockQuantity) {
        throw new Error(
          `Insufficient stock. Available: ${product.stockQuantity}`
        );
      }

      set({
        items: items.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        ),
      });
    } else {
      if (quantity > product.stockQuantity) {
        throw new Error(
          `Insufficient stock. Available: ${product.stockQuantity}`
        );
      }

      set({ items: [...items, { product, quantity, discount: 0 }] });
    }
  },

  removeItem: (productId: string) => {
    set({ items: get().items.filter((item) => item.product.id !== productId) });
  },

  updateQuantity: (productId: string, quantity: number) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }

    const item = get().items.find((i) => i.product.id === productId);
    if (item && quantity > item.product.stockQuantity) {
      throw new Error(
        `Insufficient stock. Available: ${item.product.stockQuantity}`
      );
    }

    set({
      items: get().items.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      ),
    });
  },

  updateDiscount: (productId: string, discount: number) => {
    set({
      items: get().items.map((item) =>
        item.product.id === productId ? { ...item, discount } : item
      ),
    });
  },

  clearCart: () => set({ items: [] }),

  getSubtotal: () => {
    return get().items.reduce(
      (sum, item) =>
        sum + Number(item.product.price) * item.quantity - item.discount,
      0
    );
  },

  getTotal: (discount = 0) => {
    return get().getSubtotal() - discount;
  },
}));
