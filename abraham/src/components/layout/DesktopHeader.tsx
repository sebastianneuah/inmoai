import { Link, NavLink } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { useCheckoutSummary } from '@/hooks/useCheckoutSummary';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Logo } from '@/components/brand/Logo';
import { Icon } from '@/components/ui/Icon';
import { LocationPill } from '@/components/fulfillment/LocationBar';
import { tabs } from './TabBar';

export function DesktopHeader() {
  const { itemCount, totals } = useCheckoutSummary();
  return (
    <header className="sticky top-0 z-40 hidden border-b border-line bg-paper/90 backdrop-blur-xl lg:block">
      <div className="mx-auto flex h-[72px] max-w-content items-center gap-8 px-8">
        <Link to="/" aria-label="ABRAHAM, inicio">
          <Logo />
        </Link>
        <nav aria-label="Navegación principal" className="flex items-center gap-1">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                cn(
                  'relative flex h-11 items-center rounded-full px-3.5 text-callout font-medium transition-colors',
                  isActive ? 'text-ink' : 'text-stone hover:text-ink',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {t.label}
                  {isActive && <span className="absolute inset-x-3.5 -bottom-[14px] h-0.5 rounded-full bg-red" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <LocationPill />
          <Link
            to="/carrito"
            className="press flex h-11 items-center gap-2.5 rounded-full bg-ink pl-4 pr-5 text-callout font-medium text-white hover:bg-ink-soft"
          >
            <Icon icon={ShoppingBag} size={18} />
            {itemCount > 0 ? (
              <>
                <span className="tabular">{itemCount}</span>
                <span className="h-4 w-px bg-white/25" />
                <span className="tabular">{formatPrice(totals.subtotal)}</span>
              </>
            ) : (
              'Tu pedido'
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
