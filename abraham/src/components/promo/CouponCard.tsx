import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { formatExpiry, formatPrice } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import type { Coupon } from '@/types';

export function couponValueLabel(c: Coupon) {
  if (c.kind === 'percent') return { big: `${c.value}%`, small: 'de descuento' };
  if (c.kind === 'fixed') return { big: formatPrice(c.value), small: 'de descuento' };
  return { big: 'Envío', small: 'sin cargo' };
}

interface Props {
  coupon: Coupon;
  applied: boolean;
  onApply: () => void;
}

/** Ticket-style coupon with perforated stub. */
export function CouponCard({ coupon, applied, onApply }: Props) {
  const [open, setOpen] = useState(false);
  const v = couponValueLabel(coupon);
  return (
    <article className="relative overflow-hidden rounded-lg bg-white shadow-hairline">
      <div className="grid grid-cols-[104px_1fr]">
        <div className="flex flex-col items-center justify-center px-3 py-5 text-center">
          <span className="tabular text-title2 font-semibold text-red">{v.big}</span>
          <span className="mt-0.5 text-caption text-stone">{v.small}</span>
        </div>
        <div className="relative border-l border-dashed border-line-strong py-4 pl-4 pr-4">
          {/* perforation notches */}
          <span className="absolute -left-[9px] -top-[9px] h-[18px] w-[18px] rounded-full bg-paper shadow-hairline" aria-hidden />
          <span className="absolute -bottom-[9px] -left-[9px] h-[18px] w-[18px] rounded-full bg-paper shadow-hairline" aria-hidden />
          <h3 className="text-body font-medium">{coupon.title}</h3>
          <p className="mt-0.5 text-footnote text-stone">
            {coupon.minSubtotal > 0 ? `Mínimo ${formatPrice(coupon.minSubtotal)}` : coupon.description} · {formatExpiry(coupon.expiresAt).replace('Vence el ', 'hasta el ')}
          </p>
          <div className="mt-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              className="-ml-1 flex h-9 items-center gap-1 rounded-full px-1 text-footnote font-medium text-ink-muted hover:text-ink"
            >
              Condiciones
              <Icon icon={ChevronDown} size={14} className={cn('transition-transform', open && 'rotate-180')} />
            </button>
            {applied ? (
              <span className="flex h-9 items-center gap-1.5 rounded-full bg-success-tint px-3.5 text-footnote font-medium text-success">
                <Icon icon={Check} size={14} />
                Aplicado
              </span>
            ) : (
              <Button size="sm" variant="dark" onClick={onApply}>
                Aplicar
              </Button>
            )}
          </div>
        </div>
      </div>
      {open && (
        <div className="border-t border-line bg-paper/60 px-4 py-3.5">
          <p className="mb-1.5 text-caption text-stone">
            Código <span className="font-medium tracking-wide text-ink">{coupon.code}</span> · {formatExpiry(coupon.expiresAt)}
          </p>
          <ul className="list-disc space-y-1 pl-4 text-footnote text-ink-muted">
            {coupon.terms.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
