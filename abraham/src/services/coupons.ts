import { coupons } from '@/data/coupons';
import type { Coupon } from '@/types';

/**
 * Coupon lookup. Today: local demo list.
 * Next stage: server-side validation (Supabase RPC) — the UI already handles async results.
 */
export function findCoupon(code: string | null | undefined): Coupon | undefined {
  if (!code) return undefined;
  const normalized = code.trim().toUpperCase();
  return coupons.find((c) => c.code === normalized);
}
