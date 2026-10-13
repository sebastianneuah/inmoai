import { useParams } from 'react-router-dom';
import { Check, MapPin, ReceiptText, RotateCcw, Store, Wallet } from 'lucide-react';
import { branchById } from '@/data/branches';
import { paymentMethods } from '@/data/payments';
import { useNow } from '@/hooks/useNow';
import { useReorder } from '@/hooks/useReorder';
import { formatAddress } from '@/lib/coverage';
import { formatDateLong, formatPrice, formatTime } from '@/lib/format';
import { describeModifiers } from '@/lib/pricing';
import { orderStatus, useOrders } from '@/store/orders';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { Notice } from '@/components/ui/Notice';
import { PageHeader } from '@/components/layout/PageHeader';
import { TotalsSummary } from '@/components/cart/TotalsSummary';
import { OrderTracker } from '@/components/order/OrderStatus';

export default function OrderDetail({ confirmation }: { confirmation?: boolean }) {
  const { id } = useParams();
  const order = useOrders((s) => s.orders.find((o) => o.id === id));
  const now = useNow(10000);
  const reorder = useReorder();

  if (!order) {
    return (
      <>
        <PageHeader title="Pedido" fallback="/pedidos" />
        <EmptyState
          icon={ReceiptText}
          title="No encontramos este pedido"
          body="Revisá tu historial de pedidos."
          action={<ButtonLink to="/pedidos" variant="dark" size="md">Ver pedidos</ButtonLink>}
        />
      </>
    );
  }

  const branch = branchById(order.branchId);
  const status = orderStatus(order, now);
  const payment = paymentMethods.find((p) => p.id === order.paymentMethod);
  const firstName = order.customer.name.split(' ')[0];

  return (
    <div className="pb-16">
      {!confirmation && <PageHeader title={`Pedido ${order.number}`} fallback="/pedidos" />}

      <div className="mx-auto max-w-[640px] px-gutter">
        {confirmation ? (
          <header className="flex flex-col items-center pt-[calc(48px+var(--safe-top))] text-center lg:pt-14">
            <span className="flex h-16 w-16 animate-toastIn items-center justify-center rounded-full bg-ink text-white">
              <Icon icon={Check} size={28} />
            </span>
            <h1 className="mt-6 text-title1 font-semibold">¡Gracias{firstName ? `, ${firstName}` : ''}!</h1>
            <p className="mt-2 text-body text-stone">
              Pedido <span className="font-medium text-ink">{order.number}</span> registrado.
            </p>
            <Badge tone="warning" className="mt-4">
              Simulación · no se envió a cocina ni se cobró
            </Badge>
          </header>
        ) : (
          <div className="flex items-center justify-between pt-4">
            <p className="text-footnote text-stone">
              {formatDateLong(order.createdAt)} · {formatTime(order.createdAt)}
            </p>
            {order.example ? <Badge>Ejemplo</Badge> : <Badge tone="warning">Demo</Badge>}
          </div>
        )}

        <section className="mt-8 rounded-lg bg-white p-5 shadow-hairline">
          <OrderTracker status={status} mode={order.mode} />
          {!order.example && (
            <p className="mt-4 text-caption text-stone">Seguimiento simulado para revisar la experiencia.</p>
          )}
        </section>

        <section className="mt-4 divide-y divide-line rounded-lg bg-white shadow-hairline">
          <div className="flex gap-3.5 p-4">
            <Icon icon={order.mode === 'delivery' ? MapPin : Store} className="mt-0.5" />
            <div className="min-w-0">
              <p className="text-footnote text-stone">{order.mode === 'delivery' ? 'Entrega en' : 'Retiro en'}</p>
              {order.mode === 'delivery' ? (
                <>
                  <p className="text-body font-medium">
                    {order.address ? formatAddress(order.address) : 'Dirección no registrada'}
                  </p>
                  <p className="text-footnote text-stone">
                    {order.address ? `${order.address.neighborhood} · ` : ''}Prepara {branch?.shortName}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-body font-medium">{branch?.name}</p>
                  <p className="text-footnote text-stone">{branch?.address}, {branch?.city}</p>
                </>
              )}
            </div>
          </div>
          <div className="flex gap-3.5 p-4">
            <Icon icon={Wallet} className="mt-0.5" />
            <div>
              <p className="text-footnote text-stone">Pago</p>
              <p className="text-body font-medium">{payment?.name}</p>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-lg bg-white p-5 shadow-hairline">
          <h2 className="text-headline font-semibold">Detalle</h2>
          <ul className="mt-3 space-y-3">
            {order.lines.map((l, i) => {
              const mods = describeModifiers(l.modifiers);
              return (
                <li key={i} className="flex justify-between gap-4 text-callout">
                  <span className="min-w-0">
                    <span className="tabular text-stone">{l.quantity}×</span> {l.name}
                    {mods && <span className="block text-footnote text-stone">{mods}</span>}
                    {l.notes && <span className="block text-footnote italic text-stone">“{l.notes}”</span>}
                  </span>
                  <span className="tabular shrink-0">{formatPrice(l.unitPrice * l.quantity)}</span>
                </li>
              );
            })}
          </ul>
          <TotalsSummary className="mt-4 border-t border-line pt-3" totals={order.totals} mode={order.mode} couponCode={order.couponCode} />
        </section>

        {order.example && (
          <Notice className="mt-4">Pedido de ejemplo para mostrar el historial. No corresponde a un cliente real.</Notice>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {confirmation ? (
            <>
              <ButtonLink to={`/pedidos/${order.id}`} replace variant="dark" block>
                Seguir mi pedido
              </ButtonLink>
              <ButtonLink to="/" replace variant="secondary" block>
                Volver al inicio
              </ButtonLink>
            </>
          ) : (
            <Button variant="dark" block onClick={() => reorder(order)} leading={<Icon icon={RotateCcw} size={16} />}>
              Repetir pedido
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
