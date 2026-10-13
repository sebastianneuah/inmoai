import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/cn';

export function Price({ value, className, strike }: { value: number; className?: string; strike?: boolean }) {
  return <span className={cn('tabular', strike && 'text-stone line-through', className)}>{formatPrice(value)}</span>;
}
