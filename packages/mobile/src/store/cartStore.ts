import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Content} from './contentStore';

export interface CartItem {
  content: Content;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  total: number;
  
  // Actions
  addItem: (content: Content) => void;
  removeItem: (contentId: string) => void;
  updateQuantity: (contentId: string, quantity: number) => void;
  clearCart: () => void;
  calculateTotal: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      total: 0,

      addItem: (content) => {
        const {items} = get();
        const existingItem = items.find((item) => item.content.id === content.id);

        if (existingItem) {
          set({
            items: items.map((item) =>
              item.content.id === content.id
                ? {...item, quantity: item.quantity + 1}
                : item
            ),
          });
        } else {
          set({
            items: [...items, {content, quantity: 1}],
          });
        }
        get().calculateTotal();
      },

      removeItem: (contentId) => {
        set((state) => ({
          items: state.items.filter((item) => item.content.id !== contentId),
        }));
        get().calculateTotal();
      },

      updateQuantity: (contentId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(contentId);
          return;
        }
        set((state) => ({
          items: state.items.map((item) =>
            item.content.id === contentId ? {...item, quantity} : item
          ),
        }));
        get().calculateTotal();
      },

      clearCart: () => set({items: [], total: 0}),

      calculateTotal: () => {
        const {items} = get();
        const total = items.reduce(
          (sum, item) => sum + item.content.price * item.quantity,
          0
        );
        set({total});
      },
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
