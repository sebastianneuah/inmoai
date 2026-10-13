import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

/** Quiet inline notice — used for demo disclaimers and contextual info. */
export function Notice({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'warning' | 'error';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex gap-2.5 rounded-md px-3.5 py-3 text-footnote',
        tone === 'neutral' && 'bg-mist text-ink-muted',
        tone === 'warning' && 'bg-warning-tint text-warning',
        tone === 'error' && 'bg-red-tint text-red',
        className,
      )}
    >
      <Icon icon={Info} size={16} className="mt-px" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
