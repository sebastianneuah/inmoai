import { heroCampaigns } from '@/data/campaigns';
import { coupons } from '@/data/coupons';
import { productsByCategory } from '@/data/products';
import { useCart } from '@/store/cart';
import { useUi } from '@/store/ui';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ScreenTitle } from '@/components/layout/PageHeader';
import { ProductTile } from '@/components/product/ProductTile';
import { CouponCard } from '@/components/promo/CouponCard';
import { CampaignSlide } from '@/components/promo/HeroCarousel';
import { LoyaltyTeaser } from '@/components/promo/LoyaltyTeaser';

export default function Offers() {
  const couponCode = useCart((s) => s.couponCode);
  const applyCoupon = useCart((s) => s.applyCoupon);
  const showToast = useUi((s) => s.showToast);
  const featured = heroCampaigns.find((c) => c.id === 'promo-noche') ?? heroCampaigns[0];
  const promos = productsByCategory('promociones');

  return (
    <div className="mx-auto max-w-content lg:px-8">
      <ScreenTitle title="Ofertas" subtitle="Promociones y cupones disponibles." />

      <div className="px-gutter lg:px-0">
        <CampaignSlide campaign={featured} compact eager />
      </div>

      <section className="mt-12 px-gutter lg:px-0">
        <SectionHeader title="Promociones" eyebrow="Precio especial" />
        <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-3 lg:gap-6">
          {promos.map((p) => (
            <ProductTile key={p.id} product={p} imageClassName="aspect-square lg:aspect-[4/3]" />
          ))}
        </div>
      </section>

      <section className="mt-12 px-gutter lg:px-0">
        <SectionHeader title="Cupones" eyebrow="Para tu próximo pedido" />
        <div className="mt-5 grid gap-3 lg:grid-cols-2 lg:gap-4">
          {coupons.map((c) => (
            <CouponCard
              key={c.code}
              coupon={c}
              applied={couponCode === c.code}
              onApply={() => {
                applyCoupon(c.code);
                showToast('Cupón aplicado a tu pedido', { label: 'Ver pedido', to: '/carrito' });
              }}
            />
          ))}
        </div>
        <p className="mt-3 text-caption text-stone">
          Cupones de demostración. Se aplica un cupón por pedido; las condiciones se verifican al confirmar.
        </p>
      </section>

      <div className="mt-12 px-gutter lg:px-0">
        <LoyaltyTeaser />
      </div>
    </div>
  );
}
