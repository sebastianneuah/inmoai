import { cn } from '@/lib/cn';
import type { FulfillmentMode, OrderStatus } from '@/types';
import { statusDescription, statusLabel, stepsFor } from './status';

export function StatusPill({ status }: { status: OrderStatus }) {
  const done = status === 'delivered' || status === 'picked-up';
  const cancelled = status === 'cancelled';
  return (
    <span
      className={cn(
        'inline-flex h-[24px] items-center gap-1.5 rounded-full px-2.5 text-caption font-medium',
        done && 'bg-mist text-ink-muted',
        cancelled && 'bg-red-tint text-red',
        !done && !cancelled && 'bg-ink text-white',
      )}
    >
      {!done && !cancelled && <span className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-red" />}
      {statusLabel[status]}
    </span>
  );
}

/** Segmented progress tracker. */
export function OrderTracker({ status, mode, className }: { status: OrderStatus; mode: FulfillmentMode; className?: string }) {
  const steps = stepsFor(mode);
  const current = steps.indexOf(status);
  return (
    <div className={className}>
      <p className="text-title3 font-semibold">{statusLabel[status]}</p>
      <p className="mt-0.5 text-callout text-stone">{statusDescription[status]}</p>
      <ol className="mt-4 grid grid-cols-4 gap-1.5" aria-label="Progreso del pedido">
        {steps.map((s, i) => (
          <li key={s} className="flex flex-col gap-2">
            <span className="relative h-1 overflow-hidden rounded-full bg-line">
              <span
                className={cn(
                  'absolute inset-0 rounded-full transition-transform duration-700 ease-ios',
                  i <= current ? 'translate-x-0' : '-translate-x-full',
                  i === current && current < steps.length - 1 ? 'animate-pulseDot bg-red' : 'bg-ink',
                )}
              />
            </span>
            <span className={cn('text-[11px] leading-tight', i <= current ? 'font-medium text-ink' : 'text-stone')}>
              {statusLabel[s]}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
