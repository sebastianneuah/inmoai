import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { sampleOrders } from '@/data/sampleOrders';
import { appStorage } from '@/lib/storage';
import type { Order, OrderStatus } from '@/types';

interface OrdersState {
  orders: Order[];
  addOrder: (order: Order) => void;
  reset: () => void;
}

export const useOrders = create<OrdersState>()(
  persist(
    (set) => ({
      orders: sampleOrders,
      addOrder: (order) => set((s) => ({ orders: [order, ...s.orders] })),
      reset: () => set({ orders: sampleOrders }),
    }),
    { name: 'abraham.orders', storage: appStorage, version: 1 },
  ),
);

/**
 * Simulated tracking: demo orders advance on a timer so the status UI can be reviewed.
 * Real status will come from the kitchen system (Fudo) once integrated.
 */
export function orderStatus(order: Order, now = Date.now()): OrderStatus {
  if (order.fixedStatus) return order.fixedStatus;
  const minutes = (now - new Date(order.createdAt).getTime()) / 60000;
  if (minutes < 1) return 'received';
  if (minutes < 6) return 'preparing';
  if (minutes < 20) return order.mode === 'delivery' ? 'on-the-way' : 'ready';
  return order.mode === 'delivery' ? 'delivered' : 'picked-up';
}

export const isActive = (status: OrderStatus) =>
  status === 'received' || status === 'preparing' || status === 'on-the-way' || status === 'ready';
