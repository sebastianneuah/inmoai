import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center px-8 py-14 text-center', className)}>
      <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-white text-ink shadow-hairline">
        <Icon icon={icon} size={26} />
      </span>
      <h3 className="text-headline font-semibold">{title}</h3>
      {body && <p className="mt-1.5 max-w-[280px] text-callout text-stone">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
