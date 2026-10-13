import { modifiers } from '@/data/modifiers';
import { productById } from '@/data/products';
import type { Branch, CartLine, Coupon, FulfillmentMode, ModifierId, OrderTotals } from '@/types';

/**
 * Single source of truth for every amount shown in the app.
 * All values are integer ARS; rounding happens once, on the discount.
 */

export function unitPrice(productId: string, mods: ModifierId[]) {
  const product = productById(productId);
  if (!product) return 0;
  return product.price + mods.reduce((sum, id) => sum + (modifiers[id]?.price ?? 0), 0);
}

export function lineTotal(line: Pick<CartLine, 'productId' | 'modifiers' | 'quantity'>) {
  return unitPrice(line.productId, line.modifiers) * line.quantity;
}

export function subtotalOf(lines: CartLine[]) {
  return lines.reduce((sum, l) => sum + lineTotal(l), 0);
}

export type CouponCheck =
  | { ok: true }
  | { ok: false; reason: 'not-found' | 'expired' | 'min-subtotal' | 'mode'; message: string };

export function checkCoupon(
  coupon: Coupon | undefined,
  ctx: { subtotal: number; mode: FulfillmentMode; now?: Date },
): CouponCheck {
  if (!coupon) return { ok: false, reason: 'not-found', message: 'El código no es válido.' };
  const now = ctx.now ?? new Date();
  if (now > new Date(`${coupon.expiresAt}T23:59:59-03:00`)) {
    return { ok: false, reason: 'expired', message: 'Este cupón está vencido.' };
  }
  if (coupon.modes && !coupon.modes.includes(ctx.mode)) {
    const label = coupon.modes[0] === 'pickup' ? 'Retiro' : 'Delivery';
    return { ok: false, reason: 'mode', message: `Este cupón es válido solo para ${label}.` };
  }
  if (ctx.subtotal < coupon.minSubtotal) {
    const missing = new Intl.NumberFormat('es-AR').format(coupon.minSubtotal - ctx.subtotal);
    return { ok: false, reason: 'min-subtotal', message: `Te faltan $${missing} para usar este cupón.` };
  }
  return { ok: true };
}

export function computeTotals(params: {
  lines: CartLine[];
  mode: FulfillmentMode;
  branch?: Branch;
  coupon?: Coupon;
}): OrderTotals & { couponValid: boolean } {
  const subtotal = subtotalOf(params.lines);
  const baseFee = params.mode === 'delivery' && params.branch ? params.branch.delivery.fee : 0;
  const couponValid =
    !!params.coupon && checkCoupon(params.coupon, { subtotal, mode: params.mode }).ok;

  let discount = 0;
  let deliveryFee = subtotal > 0 ? baseFee : 0;

  if (couponValid && params.coupon) {
    const c = params.coupon;
    if (c.kind === 'percent') discount = Math.round((subtotal * c.value) / 100);
    if (c.kind === 'fixed') discount = Math.min(c.value, subtotal);
    if (c.kind === 'free-delivery') deliveryFee = 0;
  }

  return { subtotal, discount, deliveryFee, total: subtotal - discount + deliveryFee, couponValid };
}

/** Stable key so identical customisations merge into a single cart line. */
export function lineKey(productId: string, mods: ModifierId[], notes?: string) {
  return [productId, [...mods].sort().join('+'), (notes ?? '').trim().toLowerCase()].join('|');
}

export function describeModifiers(ids: ModifierId[]) {
  return ids.map((id) => modifiers[id]?.name).filter(Boolean).join(' · ');
}
