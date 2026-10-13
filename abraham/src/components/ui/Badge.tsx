import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import type { ProductBadge } from '@/types';

type Tone = 'red' | 'ink' | 'neutral' | 'success' | 'warning' | 'outline';

const tones: Record<Tone, string> = {
  red: 'bg-red text-white',
  ink: 'bg-ink text-white',
  neutral: 'bg-mist text-ink-muted',
  success: 'bg-success-tint text-success',
  warning: 'bg-warning-tint text-warning',
  outline: 'bg-white/90 text-ink shadow-hairline',
};

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-[22px] items-center gap-1 whitespace-nowrap rounded-full px-2 text-[11px] font-medium leading-none tracking-[0.01em]',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const productBadge: Record<ProductBadge, { label: string; tone: Tone }> = {
  nuevo: { label: 'Nuevo', tone: 'red' },
  picante: { label: 'Picante', tone: 'outline' },
  vegetariano: { label: 'Vegetariano', tone: 'success' },
  'para-compartir': { label: 'Para compartir', tone: 'outline' },
};

export function ProductBadgeTag({ badge, className }: { badge: ProductBadge; className?: string }) {
  const b = productBadge[badge];
  return (
    <Badge tone={b.tone} className={className}>
      {b.label}
    </Badge>
  );
}
