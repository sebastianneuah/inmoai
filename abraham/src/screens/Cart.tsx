import { useNavigate } from 'react-router-dom';
import { Plus, ShoppingBag } from 'lucide-react';
import { useCheckoutSummary } from '@/hooks/useCheckoutSummary';
import { formatPrice, pluralize } from '@/lib/format';
import { useCart } from '@/store/cart';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { PageHeader } from '@/components/layout/PageHeader';
import { CartLineItem } from '@/components/cart/CartLineItem';
import { CouponField } from '@/components/cart/CouponField';
import { TotalsSummary } from '@/components/cart/TotalsSummary';
import { FulfillmentCard } from '@/components/fulfillment/FulfillmentCard';

export default function Cart() {
  const navigate = useNavigate();
  const clear = useCart((s) => s.clear);
  const { lines, itemCount, mode, totals, coupon } = useCheckoutSummary();

  if (lines.length === 0) {
    return (
      <>
        <PageHeader title="Tu pedido" fallback="/menu" />
        <EmptyState
          className="pt-20"
          icon={ShoppingBag}
          title="Tu pedido está vacío"
          body="Explorá el menú y sumá tus rolls, combinados y bebidas."
          action={
            <ButtonLink to="/menu" variant="dark" size="md">
              Ver el menú
            </ButtonLink>
          }
        />
      </>
    );
  }

  const cta = (
    <Button block onClick={() => navigate('/checkout')} className="justify-between px-6">
      <span className="flex w-full items-center justify-between">
        <span>Continuar</span>
        <span className="tabular">{formatPrice(totals.total)}</span>
      </span>
    </Button>
  );

  return (
    <div className="pb-[calc(96px+var(--safe-bottom))] lg:pb-20">
      <PageHeader
        title="Tu pedido"
        fallback="/menu"
        desktopTitle={false}
        trailing={
          <button
            type="button"
            onClick={clear}
            className="flex h-11 items-center rounded-full px-3 text-callout font-medium text-ink-muted hover:text-red"
          >
            Vaciar
          </button>
        }
      />

      <div className="mx-auto max-w-content lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-12 lg:px-8 lg:pt-4">
        <div className="px-gutter pt-2 lg:px-0">
          <h1 className="hidden text-display font-semibold lg:block">Tu pedido</h1>
          <FulfillmentCard className="lg:mt-6" />

          <section className="mt-6">
            <h2 className="eyebrow text-stone">{pluralize(itemCount, 'producto', 'productos')}</h2>
            <ul className="mt-1 divide-y divide-line">
              {lines.map((l) => (
                <CartLineItem key={l.key} line={l} />
              ))}
            </ul>
            <ButtonLink to="/menu" variant="secondary" size="md" className="mt-2">
              <Icon icon={Plus} size={16} />
              Agregar más productos
            </ButtonLink>
          </section>
        </div>

        <aside className="mt-8 px-gutter lg:sticky lg:top-[96px] lg:mt-0 lg:self-start lg:px-0">
          <div className="lg:rounded-xl lg:bg-white lg:p-6 lg:shadow-hairline">
            <h2 className="text-headline font-semibold">Cupón</h2>
            <div className="mt-3">
              <CouponField subtotal={totals.subtotal} mode={mode} />
            </div>
            <h2 className="mt-6 text-headline font-semibold">Resumen</h2>
            <TotalsSummary className="mt-2" totals={totals} mode={mode} couponCode={totals.couponValid ? coupon?.code : undefined} />
            <p className="mt-4 text-caption text-stone">Precios de demostración. El total final se confirma al cerrar el pedido.</p>
            <div className="mt-6 hidden lg:block">{cta}</div>
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 px-gutter pt-3 pb-[calc(12px+var(--safe-bottom))] backdrop-blur-xl lg:hidden">
        {cta}
      </div>
    </div>
  );
}
