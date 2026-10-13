import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { lineKey } from '@/lib/pricing';
import { appStorage } from '@/lib/storage';
import type { CartLine, ModifierId } from '@/types';

interface CartState {
  lines: CartLine[];
  couponCode: string | null;
  add: (input: { productId: string; quantity: number; modifiers?: ModifierId[]; notes?: string }) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  applyCoupon: (code: string | null) => void;
  clear: () => void;
}

export const MAX_QTY = 20;

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      couponCode: null,
      add: ({ productId, quantity, modifiers = [], notes }) =>
        set((s) => {
          const cleanNotes = notes?.trim() || undefined;
          const key = lineKey(productId, modifiers, cleanNotes);
          const existing = s.lines.find((l) => l.key === key);
          if (existing) {
            return {
              lines: s.lines.map((l) =>
                l.key === key ? { ...l, quantity: Math.min(MAX_QTY, l.quantity + quantity) } : l,
              ),
            };
          }
          return {
            lines: [...s.lines, { key, productId, quantity, modifiers: [...modifiers].sort(), notes: cleanNotes }],
          };
        }),
      setQuantity: (key, quantity) =>
        set((s) => ({
          lines:
            quantity <= 0
              ? s.lines.filter((l) => l.key !== key)
              : s.lines.map((l) => (l.key === key ? { ...l, quantity: Math.min(MAX_QTY, quantity) } : l)),
        })),
      remove: (key) => set((s) => ({ lines: s.lines.filter((l) => l.key !== key) })),
      applyCoupon: (couponCode) => set({ couponCode }),
      clear: () => set({ lines: [], couponCode: null }),
    }),
    { name: 'abraham.cart', storage: appStorage, version: 1 },
  ),
);

export const selectItemCount = (s: CartState) => s.lines.reduce((n, l) => n + l.quantity, 0);
