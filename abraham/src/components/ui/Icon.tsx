import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

/** One stroke weight for the whole app. */
export const ICON_STROKE = 1.75;

export function Icon({ icon: C, size = 20, className }: { icon: LucideIcon; size?: number; className?: string }) {
  return <C size={size} strokeWidth={ICON_STROKE} className={cn('shrink-0', className)} aria-hidden />;
}
