import { branchById } from '@/data/branches';
import { computeTotals } from '@/lib/pricing';
import { findCoupon } from '@/services/coupons';
import { selectItemCount, useCart } from '@/store/cart';
import { useSession } from '@/store/session';

/** Current cart + fulfillment context → totals. Every screen reads amounts from here. */
export function useCheckoutSummary() {
  const lines = useCart((s) => s.lines);
  const couponCode = useCart((s) => s.couponCode);
  const itemCount = useCart(selectItemCount);
  const mode = useSession((s) => s.mode);
  const branchId = useSession((s) => s.branchId);
  const branch = branchById(branchId);
  const coupon = findCoupon(couponCode);
  const totals = computeTotals({ lines, mode, branch, coupon });
  return { lines, itemCount, mode, branch, coupon, totals };
}
