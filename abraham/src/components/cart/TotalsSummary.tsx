import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { FulfillmentMode, OrderTotals } from '@/types';

function Row({ label, value, muted, accent }: { label: string; value: string; muted?: boolean; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1">
      <dt className={cn('text-callout', muted ? 'text-stone' : 'text-ink-muted')}>{label}</dt>
      <dd className={cn('tabular text-callout', accent ? 'text-red' : 'text-ink')}>{value}</dd>
    </div>
  );
}

export function TotalsSummary({
  totals,
  mode,
  couponCode,
  className,
}: {
  totals: OrderTotals;
  mode: FulfillmentMode;
  couponCode?: string;
  className?: string;
}) {
  return (
    <dl className={className}>
      <Row label="Subtotal" value={formatPrice(totals.subtotal)} />
      {totals.discount > 0 && (
        <Row label={`Descuento${couponCode ? ` (${couponCode})` : ''}`} value={`−${formatPrice(totals.discount)}`} accent />
      )}
      {mode === 'delivery' ? (
        <Row
          label="Envío"
          value={totals.deliveryFee === 0 && totals.subtotal > 0 ? 'Sin cargo' : formatPrice(totals.deliveryFee)}
        />
      ) : (
        <Row label="Retiro en sucursal" value="Sin cargo" />
      )}
      <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-line pt-3">
        <dt className="text-headline font-semibold">Total</dt>
        <dd className="tabular text-headline font-semibold">{formatPrice(totals.total)}</dd>
      </div>
    </dl>
  );
}
