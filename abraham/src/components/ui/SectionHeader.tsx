import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

interface Props {
  title: string;
  eyebrow?: string;
  action?: { label: string; to: string };
  className?: string;
  children?: ReactNode;
}

export function SectionHeader({ title, eyebrow, action, className, children }: Props) {
  return (
    <div className={cn('flex items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1 text-stone">{eyebrow}</p>}
        <h2 className="text-title3 font-semibold text-ink lg:text-title2">{title}</h2>
        {children}
      </div>
      {action && (
        <Link
          to={action.to}
          className="-mb-[9px] -mr-2 inline-flex h-11 shrink-0 items-center gap-0.5 rounded-full px-2 text-callout font-medium text-ink hover:text-red lg:-mb-[7px]"
        >
          {action.label}
          <Icon icon={ChevronRight} size={16} />
        </Link>
      )}
    </div>
  );
}
