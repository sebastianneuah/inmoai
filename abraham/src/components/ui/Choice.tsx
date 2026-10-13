import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

/** Visual indicator shared by checkbox and radio rows. */
function Indicator({ type, checked }: { type: 'checkbox' | 'radio'; checked: boolean }) {
  if (type === 'radio') {
    return (
      <span
        aria-hidden
        className={cn(
          'flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors',
          checked ? 'border-red' : 'border-line-strong',
        )}
      >
        <span className={cn('h-[10px] w-[10px] rounded-full bg-red transition-transform', checked ? 'scale-100' : 'scale-0')} />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        'flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[6px] border-[1.5px] transition-colors',
        checked ? 'border-red bg-red text-white' : 'border-line-strong bg-white',
      )}
    >
      {checked && <Icon icon={Check} size={14} className="stroke-[2.5]" />}
    </span>
  );
}

interface ChoiceRowProps {
  type: 'checkbox' | 'radio';
  checked: boolean;
  onChange: () => void;
  title: ReactNode;
  description?: ReactNode;
  trailing?: ReactNode;
  disabled?: boolean;
  name?: string;
  className?: string;
}

/** Full-width selectable row, 56px+ tall. */
export function ChoiceRow({ type, checked, onChange, title, description, trailing, disabled, name, className }: ChoiceRowProps) {
  return (
    <label
      className={cn(
        'flex min-h-14 cursor-pointer items-center gap-3.5 py-3',
        disabled && 'cursor-not-allowed opacity-45',
        className,
      )}
    >
      <input
        type={type}
        name={name}
        className="sr-only"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <Indicator type={type} checked={checked} />
      <span className="min-w-0 flex-1">
        <span className="block text-body text-ink">{title}</span>
        {description && <span className="mt-0.5 block text-footnote text-stone">{description}</span>}
      </span>
      {trailing && <span className="shrink-0 text-callout text-ink-muted">{trailing}</span>}
    </label>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-[30px] w-[50px] shrink-0 items-center rounded-full transition-colors duration-200',
        checked ? 'bg-red' : 'bg-line-strong',
      )}
    >
      <span
        className={cn(
          'h-[26px] w-[26px] rounded-full bg-white shadow-[0_2px_4px_rgba(17,17,17,0.2)] transition-transform duration-300 ease-ios',
          checked ? 'translate-x-[22px]' : 'translate-x-[2px]',
        )}
      />
    </button>
  );
}
