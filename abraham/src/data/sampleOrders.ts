import type { Order } from '@/types';

/**
 * Example orders so the Pedidos screen can be reviewed before any real order exists.
 * They are flagged `example: true` and labelled as such in the UI.
 */
export const sampleOrders: Order[] = [
  {
    id: 'ejemplo-2',
    number: 'EJ-0002',
    createdAt: '2026-10-03T21:12:00-03:00',
    mode: 'delivery',
    branchId: 'palermo-chico',
    customer: { name: 'Pedido de ejemplo', phone: '' },
    lines: [
      { productId: 'combinado-30', name: 'Combinado 30', quantity: 1, modifiers: [], unitPrice: 41500 },
      { productId: 'limonada', name: 'Limonada', quantity: 2, modifiers: [], unitPrice: 4400 },
    ],
    paymentMethod: 'cash',
    totals: { subtotal: 50300, discount: 0, deliveryFee: 2500, total: 52800 },
    simulated: true,
    example: true,
    fixedStatus: 'delivered',
  },
  {
    id: 'ejemplo-1',
    number: 'EJ-0001',
    createdAt: '2026-09-19T13:40:00-03:00',
    mode: 'pickup',
    branchId: 'palermo-chico',
    customer: { name: 'Pedido de ejemplo', phone: '' },
    lines: [
      { productId: 'philadelphia', name: 'Philadelphia Roll', quantity: 2, modifiers: ['sin-palta'], unitPrice: 14900 },
      { productId: 'poke-salmon', name: 'Poke de Salmón', quantity: 1, modifiers: [], unitPrice: 16900 },
    ],
    paymentMethod: 'transfer',
    totals: { subtotal: 46700, discount: 0, deliveryFee: 0, total: 46700 },
    simulated: true,
    example: true,
    fixedStatus: 'picked-up',
  },
];
