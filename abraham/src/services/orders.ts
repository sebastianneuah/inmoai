import { branchById } from '@/data/branches';
import { productById } from '@/data/products';
import { computeTotals, unitPrice } from '@/lib/pricing';
import { findCoupon } from '@/services/coupons';
import type { Address, CartLine, FulfillmentMode, Order, PaymentMethodId } from '@/types';

export interface SubmitOrderInput {
  lines: CartLine[];
  mode: FulfillmentMode;
  branchId: string;
  address?: Address;
  customer: Order['customer'];
  couponCode?: string | null;
  paymentMethod: PaymentMethodId;
}

/**
 * SIMULATED order submission.
 * Totals are recomputed here (never trusted from the UI), mirroring what the backend will do.
 * Nothing is sent to a kitchen and no payment is processed.
 *
 * Next stage: insert into Supabase, route to `branch.kitchenRef` (Fudo),
 * and create a Mercado Pago preference when paying online.
 */
export async function submitOrder(input: SubmitOrderInput): Promise<Order> {
  const branch = branchById(input.branchId);
  if (!branch || !branch.active) throw new Error('La sucursal seleccionada no está recibiendo pedidos.');
  if (input.lines.length === 0) throw new Error('Tu pedido está vacío.');

  const coupon = findCoupon(input.couponCode);
  const totals = computeTotals({ lines: input.lines, mode: input.mode, branch, coupon });

  await new Promise((r) => setTimeout(r, 900));

  const seq = Math.floor(1000 + Math.random() * 9000);
  return {
    id: `demo-${Date.now()}`,
    number: `D-${seq}`,
    createdAt: new Date().toISOString(),
    mode: input.mode,
    branchId: branch.id,
    address: input.mode === 'delivery' ? input.address : undefined,
    customer: input.customer,
    lines: input.lines.map((l) => ({
      productId: l.productId,
      name: productById(l.productId)?.name ?? 'Producto',
      quantity: l.quantity,
      modifiers: l.modifiers,
      notes: l.notes,
      unitPrice: unitPrice(l.productId, l.modifiers),
    })),
    couponCode: totals.couponValid ? coupon?.code : undefined,
    paymentMethod: input.paymentMethod,
    totals: {
      subtotal: totals.subtotal,
      discount: totals.discount,
      deliveryFee: totals.deliveryFee,
      total: totals.total,
    },
    simulated: true,
  };
}
