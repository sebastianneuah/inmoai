import type { PaymentMethod } from '@/types';

/**
 * Mercado Pago stays unavailable until Checkout Pro + verified webhooks are integrated.
 * Nothing in this prototype charges money.
 */
export const paymentMethods: PaymentMethod[] = [
  {
    id: 'cash',
    name: 'Efectivo',
    description: 'Pagás al recibir o al retirar',
    available: true,
  },
  {
    id: 'transfer',
    name: 'Transferencia',
    description: 'Te enviamos los datos al confirmar',
    available: true,
  },
  {
    id: 'mercadopago',
    name: 'Mercado Pago',
    description: 'Disponible próximamente',
    available: false,
  },
];
