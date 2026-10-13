import { NavLink } from 'react-router-dom';
import { CircleUserRound, House, ReceiptText, Tag, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/ui/Icon';

export const tabs: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: '/', label: 'Inicio', icon: House, end: true },
  { to: '/menu', label: 'Menú', icon: UtensilsCrossed },
  { to: '/ofertas', label: 'Ofertas', icon: Tag },
  { to: '/pedidos', label: 'Pedidos', icon: ReceiptText },
  { to: '/cuenta', label: 'Mi cuenta', icon: CircleUserRound },
];

export function TabBar() {
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-safe backdrop-blur-xl lg:hidden"
    >
      <ul className="mx-auto grid h-tabbar max-w-[560px] grid-cols-5">
        {tabs.map((t) => (
          <li key={t.to}>
            <NavLink
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                cn(
                  'flex h-full flex-col items-center justify-center gap-1 text-[10.5px] font-medium tracking-[0.01em] transition-colors',
                  isActive ? 'text-red' : 'text-stone hover:text-ink',
                )
              }
            >
              <Icon icon={t.icon} size={22} />
              {t.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
