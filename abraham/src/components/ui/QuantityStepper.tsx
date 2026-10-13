import { Minus, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

interface Props {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  size?: 'md' | 'sm';
  /** When true, reaching 0 shows a trash icon instead of minus. */
  removable?: boolean;
  label?: string;
}

export function QuantityStepper({ value, onChange, min = 1, max = 20, size = 'md', removable, label = 'Cantidad' }: Props) {
  const lowest = removable ? 0 : min;
  const canDec = value > lowest;
  const canInc = value < max;
  const showTrash = removable && value <= 1;
  const h = size === 'md' ? 'h-11' : 'h-9';
  const w = size === 'md' ? 'w-11' : 'w-9';

  const btn = cn(
    'press relative flex items-center justify-center rounded-full text-ink transition-colors hover:bg-mist disabled:opacity-30 disabled:hover:bg-transparent',
    h,
    w,
    // Extend the hit area to 44px on the compact size.
    size === 'sm' && 'before:absolute before:-inset-1 before:content-[""]',
  );

  return (
    <div
      role="group"
      aria-label={label}
      className={cn('inline-flex items-center rounded-full bg-white shadow-hairline', h)}
    >
      <button
        type="button"
        className={btn}
        disabled={!canDec}
        onClick={() => onChange(value - 1)}
        aria-label={showTrash ? 'Quitar' : 'Restar uno'}
      >
        <Icon icon={showTrash ? Trash2 : Minus} size={size === 'md' ? 18 : 16} />
      </button>
      <span
        className={cn('tabular text-center font-medium', size === 'md' ? 'min-w-8 text-body' : 'min-w-6 text-callout')}
        aria-live="polite"
      >
        {value}
      </span>
      <button type="button" className={btn} disabled={!canInc} onClick={() => onChange(value + 1)} aria-label="Sumar uno">
        <Icon icon={Plus} size={size === 'md' ? 18 : 16} />
      </button>
    </div>
  );
}
