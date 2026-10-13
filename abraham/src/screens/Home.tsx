import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, ShoppingBag, Store, Ticket, UserRound } from 'lucide-react';
import { branches } from '@/data/branches';
import { heroCampaigns, secondaryCampaigns } from '@/data/campaigns';
import { categories } from '@/data/categories';
import { coupons } from '@/data/coupons';
import { featuredProducts, productsByCategory } from '@/data/products';
import { selectItemCount, useCart } from '@/store/cart';
import { Logo } from '@/components/brand/Logo';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { LocationBar } from '@/components/fulfillment/LocationBar';
import { CategoryThumb } from '@/components/product/CategoryThumb';
import { ProductTile } from '@/components/product/ProductTile';
import { PromoListItem } from '@/components/product/PromoListItem';
import { CampaignCard } from '@/components/promo/CampaignCard';
import { HeroCarousel } from '@/components/promo/HeroCarousel';

/** Horizontal rail on phones, grid on desktop. */
function Rail({ children, cols = 'lg:grid-cols-4' }: { children: ReactNode; cols?: string }) {
  return (
    <div
      className={`no-scrollbar -mx-gutter flex snap-x snap-mandatory scroll-px-gutter gap-4 overflow-x-auto px-gutter pb-1 lg:mx-0 lg:grid lg:gap-6 lg:overflow-visible lg:px-0 ${cols}`}
    >
      {children}
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const count = useCart(selectItemCount);
  const featured = featuredProducts();
  const promos = productsByCategory('promociones');

  return (
    <div className="mx-auto max-w-content lg:px-8">
      {/* Mobile header */}
      <header className="px-gutter pt-[calc(8px+var(--safe-top))] lg:hidden">
        <div className="flex h-14 items-center justify-between">
          <Logo />
          <div className="-mr-2 flex items-center">
            <IconButton icon={UserRound} label="Mi cuenta" onClick={() => navigate('/cuenta')} />
            <IconButton icon={ShoppingBag} label="Ver pedido" badge={count} onClick={() => navigate('/carrito')} />
          </div>
        </div>
        <LocationBar className="mt-2" />
      </header>

      {/* Desktop greeting row */}
      <div className="hidden items-end justify-between pb-8 pt-10 lg:flex">
        <div>
          <p className="eyebrow text-stone">Sushi kosher · Buenos Aires</p>
          <h1 className="mt-2 text-display font-semibold">¿Qué pedimos hoy?</h1>
        </div>
        <Link to="/menu" className="flex h-11 items-center gap-1 text-callout font-medium hover:text-red">
          Ver el menú completo <Icon icon={ChevronRight} size={16} />
        </Link>
      </div>

      <div className="mt-6 lg:mt-0">
        <HeroCarousel campaigns={heroCampaigns} />
      </div>

      {/* Categories */}
      <section className="mt-8 px-gutter lg:mt-16 lg:px-0">
        <SectionHeader title="Categorías" action={{ label: 'Menú', to: '/menu' }} />
        <div className="no-scrollbar -mx-gutter mt-4 flex gap-3 overflow-x-auto px-gutter lg:mx-0 lg:grid lg:grid-cols-11 lg:gap-4 lg:overflow-visible lg:px-0">
          {categories.map((c) => (
            <CategoryThumb key={c.id} category={c} />
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="mt-12 px-gutter lg:mt-16 lg:px-0">
        <SectionHeader title="Destacados" eyebrow="Recomendados" action={{ label: 'Ver todo', to: '/menu' }} />
        <div className="mt-5">
          <Rail>
            {featured.map((p) => (
              <ProductTile key={p.id} product={p} className="w-[164px] shrink-0 snap-start lg:w-auto" />
            ))}
          </Rail>
        </div>
      </section>

      {/* Secondary campaigns */}
      <section className="mt-12 grid gap-3 px-gutter lg:mt-16 lg:grid-cols-2 lg:gap-6 lg:px-0">
        {secondaryCampaigns.map((c) => (
          <CampaignCard key={c.id} campaign={c} />
        ))}
      </section>

      {/* Promotions — dark band breaks the rhythm of light sections */}
      <section className="mt-12 lg:mt-16">
        <div className="bg-ink px-gutter py-10 text-white lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:gap-x-16 lg:rounded-xl lg:p-14">
          <div>
            <p className="eyebrow flex items-center gap-2 text-white/60">
              <span className="h-1.5 w-1.5 rounded-full bg-red" />
              Precio especial
            </p>
            <h2 className="mt-2 text-title2 font-semibold lg:text-display">Promociones</h2>
            <p className="mt-2 max-w-[320px] text-callout text-white/70">
              Combinaciones pensadas para compartir, con bebidas incluidas.
            </p>
            <Link
              to="/ofertas"
              className="mt-5 hidden h-11 items-center gap-1 text-callout font-medium text-white hover:text-white/80 lg:inline-flex"
            >
              Ver todas las ofertas <Icon icon={ChevronRight} size={16} />
            </Link>
          </div>
          <div className="mt-4 divide-y divide-white/10 lg:mt-0">
            {promos.map((p) => (
              <PromoListItem key={p.id} product={p} />
            ))}
          </div>
          <Link
            to="/ofertas"
            className="press mt-4 flex min-h-14 items-center gap-3.5 rounded-lg bg-white/[0.06] px-4 py-3 hover:bg-white/10 lg:col-span-2 lg:mt-8"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red text-white">
              <Icon icon={Ticket} size={18} />
            </span>
            <span className="flex-1">
              <span className="block text-body font-medium">{coupons.length} cupones disponibles</span>
              <span className="block text-footnote text-white/60">Aplicalos antes de confirmar tu pedido</span>
            </span>
            <Icon icon={ChevronRight} size={18} className="text-white/50" />
          </Link>
        </div>
      </section>

      {/* Branches */}
      <section className="mt-12 px-gutter lg:mt-16 lg:px-0">
        <SectionHeader title="Sucursales" action={{ label: 'Ver todas', to: '/sucursales' }} />
        <ul className="mt-4 divide-y divide-line overflow-hidden rounded-lg bg-white shadow-hairline lg:grid lg:grid-cols-2 lg:divide-x lg:divide-y-0">
          {branches.map((b) => (
            <li key={b.id} className="flex items-start gap-3.5 px-4 py-4">
              <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${b.active ? 'bg-ink text-white' : 'bg-mist text-stone'}`}>
                <Icon icon={Store} size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className={b.active ? 'text-body font-medium' : 'text-body font-medium text-stone'}>{b.name}</p>
                <p className="text-footnote text-stone">{b.address}, {b.city}</p>
                <div className="mt-2">
                  {b.active ? <Badge tone="success">Recibiendo pedidos</Badge> : <Badge>Próximamente</Badge>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-12 px-gutter pb-4 text-center text-caption text-stone lg:px-0">
        Prototipo · Precios de demostración. Los pedidos no se envían a cocina ni se cobran.
      </footer>
    </div>
  );
}
