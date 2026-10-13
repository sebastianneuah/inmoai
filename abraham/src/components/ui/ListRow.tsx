import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

interface Props {
  icon?: LucideIcon;
  title: ReactNode;
  detail?: ReactNode;
  to?: string;
  onClick?: () => void;
  trailing?: ReactNode;
  danger?: boolean;
  chevron?: boolean;
}

/** Settings-style row. Use inside <ListGroup>. */
export function ListRow({ icon, title, detail, to, onClick, trailing, danger, chevron = true }: Props) {
  const content = (
    <>
      {icon && <Icon icon={icon} size={20} className={danger ? 'text-red' : 'text-ink'} />}
      <span className="min-w-0 flex-1">
        <span className={cn('block truncate text-body', danger ? 'text-red' : 'text-ink')}>{title}</span>
        {detail && <span className="mt-0.5 block truncate text-footnote text-stone">{detail}</span>}
      </span>
      {trailing}
      {(to || onClick) && chevron && <Icon icon={ChevronRight} size={18} className="text-stone-light" />}
    </>
  );
  const cls = 'flex min-h-14 w-full items-center gap-3.5 px-4 py-3 text-left transition-colors hover:bg-paper';
  if (to)
    return (
      <Link to={to} className={cls}>
        {content}
      </Link>
    );
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={cls}>
        {content}
      </button>
    );
  return <div className={cls}>{content}</div>;
}

export function ListGroup({ children, title, className }: { children: ReactNode; title?: string; className?: string }) {
  return (
    <section className={className}>
      {title && <h3 className="eyebrow mb-2 px-1 text-stone">{title}</h3>}
      <div className="divide-y divide-line overflow-hidden rounded-lg bg-white shadow-hairline">{children}</div>
    </section>
  );
}
