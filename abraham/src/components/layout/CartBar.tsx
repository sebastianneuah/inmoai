import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { useCheckoutSummary } from '@/hooks/useCheckoutSummary';
import { formatPrice } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';

const SHOW_ON = ['/', '/menu', '/ofertas', '/cuenta/favoritos'];

/** Floating order summary above the tab bar (mobile). */
export function CartBar() {
  const { itemCount, totals } = useCheckoutSummary();
  const { pathname } = useLocation();
  if (itemCount === 0 || !SHOW_ON.includes(pathname)) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(64px+var(--safe-bottom)+10px)] z-30 px-4 lg:hidden">
      <Link
        to="/carrito"
        className="press pointer-events-auto mx-auto flex h-14 max-w-[528px] animate-toastIn items-center gap-3 rounded-full bg-ink pl-2 pr-5 text-white shadow-float"
      >
        <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
          <Icon icon={ShoppingBag} size={18} />
          <span className="tabular absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red px-1 text-[10px] font-semibold">
            {itemCount}
          </span>
        </span>
        <span className="flex-1 text-callout font-medium">Ver pedido</span>
        <span className="tabular text-callout font-medium">{formatPrice(totals.subtotal)}</span>
      </Link>
    </div>
  );
}
