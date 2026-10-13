import type { Coupon } from '@/types';

/**
 * DEMO COUPONS. Validation happens locally in this prototype;
 * production validation will move to the backend (see services/coupons.ts).
 */
export const coupons: Coupon[] = [
  {
    code: 'BIENVENIDA10',
    title: '10% en tu primer pedido',
    description: 'Descuento sobre el subtotal de productos.',
    kind: 'percent',
    value: 10,
    minSubtotal: 20000,
    expiresAt: '2026-12-31',
    terms: [
      'Válido para un pedido por cliente.',
      'Compra mínima de $20.000 en productos.',
      'No acumulable con otras promociones.',
    ],
  },
  {
    code: 'RETIRO',
    title: '$3.000 menos retirando en sucursal',
    description: 'Para pedidos con Retiro.',
    kind: 'fixed',
    value: 3000,
    minSubtotal: 25000,
    expiresAt: '2026-11-30',
    terms: ['Válido solo para pedidos con Retiro.', 'Compra mínima de $25.000 en productos.'],
    modes: ['pickup'],
  },
  {
    code: 'ENVIOSINCARGO',
    title: 'Envío sin cargo',
    description: 'En pedidos con delivery.',
    kind: 'free-delivery',
    value: 0,
    minSubtotal: 40000,
    expiresAt: '2026-11-15',
    terms: ['Válido solo para delivery dentro de la zona de cobertura.', 'Compra mínima de $40.000 en productos.'],
    modes: ['delivery'],
  },
];
