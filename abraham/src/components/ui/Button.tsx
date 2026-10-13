import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'dark' | 'secondary' | 'ghost' | 'light';
type Size = 'lg' | 'md' | 'sm';

const base =
  'press relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-40';

const variants: Record<Variant, string> = {
  primary: 'bg-red text-white hover:bg-red-hover',
  dark: 'bg-ink text-white hover:bg-ink-soft',
  secondary: 'bg-white text-ink shadow-hairline hover:bg-mist',
  ghost: 'bg-transparent text-ink hover:bg-mist',
  light: 'bg-white text-ink hover:bg-paper',
};

const sizes: Record<Size, string> = {
  lg: 'h-[52px] px-6 text-body',
  md: 'h-11 px-5 text-callout',
  sm: 'h-9 px-4 text-footnote',
};

export interface ButtonStyleProps {
  variant?: Variant;
  size?: Size;
  block?: boolean;
}

export const buttonClass = ({ variant = 'primary', size = 'lg', block }: ButtonStyleProps, extra?: string) =>
  cn(base, variants[variant], sizes[size], block && 'w-full', extra);

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, ButtonStyleProps {
  loading?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, block, loading, leading, trailing, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={buttonClass({ variant, size, block }, className)}
      {...rest}
    >
      {loading ? <Spinner className="h-4 w-4" /> : leading}
      {/* `contents` lets callers lay out children directly in the button's flex row */}
      <span className="contents">{children}</span>
      {!loading && trailing}
    </button>
  );
});

export function ButtonLink({
  variant,
  size,
  block,
  className,
  children,
  ...rest
}: LinkProps & ButtonStyleProps) {
  return (
    <Link className={buttonClass({ variant, size, block }, className)} {...rest}>
      {children}
    </Link>
  );
}
