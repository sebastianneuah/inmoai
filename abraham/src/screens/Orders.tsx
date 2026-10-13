import { Link } from 'react-router-dom';
import { ChevronRight, ReceiptText } from 'lucide-react';
import { branchById } from '@/data/branches';
import { useNow } from '@/hooks/useNow';
import { useReorder } from '@/hooks/useReorder';
import { formatPrice, formatTime } from '@/lib/format';
import { isActive, orderStatus, useOrders } from '@/store/orders';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { ScreenTitle } from '@/components/layout/PageHeader';
import { OrderCard } from '@/components/order/OrderCard';
import { OrderTracker } from '@/components/order/OrderStatus';

export default function Orders() {
  const orders = useOrders((s) => s.orders);
  const now = useNow();
  const reorder = useReorder();

  const active = orders.filter((o) => isActive(orderStatus(o, now)));
  const past = orders.filter((o) => !isActive(orderStatus(o, now)));

  return (
    <div className="mx-auto max-w-content lg:px-8">
      <ScreenTitle title="Pedidos" />

      {orders.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="Todavía no hiciste pedidos"
          body="Cuando hagas tu primer pedido, vas a poder seguirlo desde acá."
          action={<ButtonLink to="/menu" variant="dark" size="md">Ver el menú</ButtonLink>}
        />
      ) : (
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12">
          <section className="px-gutter lg:px-0">
            <h2 className="eyebrow mb-3 text-stone">En curso</h2>
            {active.length === 0 ? (
              <div className="rounded-lg bg-white px-5 py-6 text-center shadow-hairline">
                <p className="text-body font-medium">No tenés pedidos en curso</p>
                <p className="mt-1 text-footnote text-stone">Tus pedidos activos aparecen acá con su estado.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {active.map((o) => {
                  const branch = branchById(o.branchId);
                  return (
                    <Link key={o.id} to={`/pedidos/${o.id}`} className="block rounded-lg bg-white p-5 shadow-hairline hover:shadow-[0_0_0_1px_#D9D6D2]">
                      <OrderTracker status={orderStatus(o, now)} mode={o.mode} />
                      <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
                        <div className="min-w-0">
                          <p className="text-callout font-medium">
                            N.º {o.number} · {o.mode === 'delivery' ? 'Delivery' : 'Retiro'} · {branch?.shortName}
                          </p>
                          <p className="text-footnote text-stone">
                            {formatTime(o.createdAt)} · <span className="tabular">{formatPrice(o.totals.total)}</span> · Simulado
                          </p>
                        </div>
                        <Icon icon={ChevronRight} size={18} className="text-stone-light" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          <section className="mt-10 px-gutter lg:mt-0 lg:px-0">
            <h2 className="eyebrow mb-3 text-stone">Historial</h2>
            {past.length === 0 ? (
              <p className="text-callout text-stone">Sin pedidos anteriores.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {past.map((o) => (
                  <OrderCard key={o.id} order={o} now={now} onReorder={() => reorder(o)} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
