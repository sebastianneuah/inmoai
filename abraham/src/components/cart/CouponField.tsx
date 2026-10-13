import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Ticket, X } from 'lucide-react';
import { checkCoupon } from '@/lib/pricing';
import { findCoupon } from '@/services/coupons';
import { useCart } from '@/store/cart';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import type { FulfillmentMode } from '@/types';

export function CouponField({ subtotal, mode }: { subtotal: number; mode: FulfillmentMode }) {
  const couponCode = useCart((s) => s.couponCode);
  const applyCoupon = useCart((s) => s.applyCoupon);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const applied = findCoupon(couponCode);
  const check = applied ? checkCoupon(applied, { subtotal, mode }) : null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return setError('Ingresá un código.');
    const c = findCoupon(value);
    if (!c) return setError('El código no es válido.');
    setError(null);
    setValue('');
    applyCoupon(c.code);
  };

  if (applied) {
    return (
      <div>
        <div className="flex min-h-14 items-center gap-3 rounded-md bg-white px-4 py-2 shadow-hairline">
          <Icon icon={Ticket} size={18} className={check?.ok ? 'text-red' : 'text-stone'} />
          <div className="min-w-0 flex-1">
            <p className="text-callout font-medium tracking-wide">{applied.code}</p>
            <p className={cn('text-footnote', check?.ok ? 'text-success' : 'text-warning')}>
              {check?.ok ? applied.title : check && !check.ok ? check.message : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={() => applyCoupon(null)}
            aria-label="Quitar cupón"
            className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-stone hover:bg-mist hover:text-ink"
          >
            <Icon icon={X} size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <label htmlFor="coupon" className="sr-only">
        Código de cupón
      </label>
      <div className="flex gap-2">
        <input
          id="coupon"
          value={value}
          onChange={(e) => {
            setValue(e.target.value.toUpperCase());
            setError(null);
          }}
          placeholder="Código de cupón"
          autoCapitalize="characters"
          aria-invalid={!!error}
          className={cn(
            'h-12 min-w-0 flex-1 rounded-md bg-white px-4 text-body tracking-wide shadow-hairline outline-none placeholder:tracking-normal placeholder:text-stone-light focus:shadow-[0_0_0_1.5px_#111111]',
            error && 'shadow-[0_0_0_1.5px_#C8102E]',
          )}
        />
        <Button type="submit" variant="dark" size="md" className="h-12">
          Aplicar
        </Button>
      </div>
      <div className="mt-2 flex items-center justify-between text-footnote">
        {error ? <p className="text-red" role="alert">{error}</p> : <span />}
        <Link to="/ofertas" className="flex h-8 items-center font-medium text-ink-muted hover:text-ink">
          Ver cupones
        </Link>
      </div>
    </form>
  );
}
