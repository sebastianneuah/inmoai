import type { FulfillmentMode, OrderStatus } from '@/types';

export const statusLabel: Record<OrderStatus, string> = {
  received: 'Recibido',
  preparing: 'En preparación',
  'on-the-way': 'En camino',
  ready: 'Listo para retirar',
  delivered: 'Entregado',
  'picked-up': 'Retirado',
  cancelled: 'Cancelado',
};

export const statusDescription: Record<OrderStatus, string> = {
  received: 'La sucursal recibió tu pedido.',
  preparing: 'Estamos preparando tu pedido.',
  'on-the-way': 'Tu pedido salió de la sucursal.',
  ready: 'Tu pedido te espera en la sucursal.',
  delivered: 'Pedido entregado.',
  'picked-up': 'Pedido retirado.',
  cancelled: 'El pedido fue cancelado.',
};

export function stepsFor(mode: FulfillmentMode): OrderStatus[] {
  return mode === 'delivery'
    ? ['received', 'preparing', 'on-the-way', 'delivered']
    : ['received', 'preparing', 'ready', 'picked-up'];
}
