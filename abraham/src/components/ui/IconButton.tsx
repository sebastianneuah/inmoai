import { forwardRef, type ButtonHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label: string;
  variant?: 'plain' | 'surface' | 'floating' | 'dark';
  badge?: number;
  iconSize?: number;
}

const variants = {
  plain: 'text-ink hover:bg-mist',
  surface: 'bg-white text-ink shadow-hairline hover:bg-mist',
  floating: 'bg-white/95 text-ink shadow-float backdrop-blur',
  dark: 'bg-ink text-white hover:bg-ink-soft',
};

/** Always a 44×44 target. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, variant = 'plain', badge, iconSize = 20, className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'press relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors',
        variants[variant],
        className,
      )}
      {...rest}
    >
      <Icon icon={icon} size={iconSize} />
      {badge ? (
        <span className="tabular absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-paper">
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </button>
  );
});
