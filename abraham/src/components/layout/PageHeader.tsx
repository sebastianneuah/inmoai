import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useScrolled } from '@/hooks/useScrolled';
import { cn } from '@/lib/cn';
import { IconButton } from '@/components/ui/IconButton';

interface Props {
  title?: string;
  /** Route to go back to when there is no history (deep link). */
  fallback?: string;
  trailing?: ReactNode;
  transparent?: boolean;
  /** Hide the compact title on desktop when the screen renders its own large heading. */
  desktopTitle?: boolean;
}

/** Compact sticky header for pushed screens. On desktop it becomes an inline breadcrumb row. */
export function PageHeader({ title, fallback = '/', trailing, transparent, desktopTitle = true }: Props) {
  const navigate = useNavigate();
  const scrolled = useScrolled();
  const back = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate(fallback));

  return (
    <header
      className={cn(
        'sticky top-0 z-30 pt-safe transition-colors duration-200 lg:static lg:!bg-transparent lg:pt-6 lg:backdrop-blur-none',
        transparent && !scrolled ? 'bg-transparent' : 'bg-paper/90 backdrop-blur-xl',
        scrolled && !transparent && 'border-b border-line lg:border-0',
      )}
    >
      <div className="mx-auto flex h-[52px] max-w-content items-center gap-2 px-2 lg:px-8">
        <IconButton icon={ChevronLeft} label="Volver" onClick={back} variant={transparent && !scrolled ? 'floating' : 'plain'} iconSize={22} />
        <h1
          className={cn(
            'min-w-0 flex-1 truncate text-center text-headline font-semibold lg:text-left',
            transparent && !scrolled && 'opacity-0',
            !desktopTitle && 'lg:invisible',
          )}
        >
          {title}
        </h1>
        <div
          className={cn(
            'flex min-w-11 justify-end',
            transparent && !scrolled && trailing && '[&>*]:rounded-full [&>*]:bg-white/95 [&>*]:shadow-float',
          )}
        >
          {trailing}
        </div>
      </div>
    </header>
  );
}

/** Large left-aligned title for root tab screens. */
export function ScreenTitle({ title, subtitle, trailing }: { title: string; subtitle?: string; trailing?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4 px-gutter pt-[calc(20px+var(--safe-top))] pb-4 lg:px-0 lg:pt-10 lg:pb-6">
      <div>
        <h1 className="text-title1 font-semibold lg:text-display">{title}</h1>
        {subtitle && <p className="mt-1 text-callout text-stone">{subtitle}</p>}
      </div>
      {trailing}
    </div>
  );
}
