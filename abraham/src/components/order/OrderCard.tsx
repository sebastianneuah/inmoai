import { Link } from 'react-router-dom';
import { RotateCcw } from 'lucide-react';
import { branchById } from '@/data/branches';
import { formatDate, formatPrice, formatTime } from '@/lib/format';
import { orderStatus } from '@/store/orders';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import type { Order } from '@/types';
import { StatusPill } from './OrderStatus';

export function OrderCard({ order, onReorder, now }: { order: Order; onReorder: () => void; now: number }) {
  const branch = branchById(order.branchId);
  const status = orderStatus(order, now);
  const items = order.lines.map((l) => `${l.quantity}× ${l.name}`).join(', ');
  return (
    <article className="rounded-lg bg-white shadow-hairline">
      <Link to={`/pedidos/${order.id}`} className="block p-4 pb-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-caption text-stone">
            {formatDate(order.createdAt)} · {formatTime(order.createdAt)} · N.º {order.number}
          </p>
          {order.example ? <Badge>Ejemplo</Badge> : <Badge tone="warning">Demo</Badge>}
        </div>
        <p className="mt-2 text-body font-medium">
          {order.mode === 'delivery' ? 'Delivery' : 'Retiro'} · {branch?.shortName}
        </p>
        <p className="mt-0.5 line-clamp-2 text-footnote text-stone">{items}</p>
      </Link>
      <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <StatusPill status={status} />
          <span className="tabular text-callout font-medium">{formatPrice(order.totals.total)}</span>
        </div>
        <Button size="sm" variant="secondary" onClick={onReorder} leading={<Icon icon={RotateCcw} size={14} />}>
          Repetir
        </Button>
      </div>
    </article>
  );
}
