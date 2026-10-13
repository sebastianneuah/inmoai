import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

interface Option<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

interface Props<T extends string> {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  size?: 'md' | 'sm';
  className?: string;
  label: string;
}

export function Segmented<T extends string>({ value, options, onChange, size = 'md', className, label }: Props<T>) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('relative grid rounded-full bg-mist p-1', size === 'md' ? 'h-11' : 'h-10', className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden
        className="absolute bottom-1 top-1 rounded-full bg-white shadow-[0_1px_3px_rgba(17,17,17,0.12)] transition-transform duration-300 ease-ios"
        style={{
          width: `calc((100% - 8px) / ${options.length})`,
          transform: `translateX(${index * 100}%)`,
          left: 4,
        }}
      />
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'relative z-10 flex items-center justify-center gap-1.5 rounded-full px-3 font-medium transition-colors',
              size === 'md' ? 'text-callout' : 'text-footnote',
              active ? 'text-ink' : 'text-stone hover:text-ink',
            )}
          >
            {o.icon && <Icon icon={o.icon} size={16} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
