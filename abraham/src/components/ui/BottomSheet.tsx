import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { IconButton } from './IconButton';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/**
 * Bottom sheet on phones, centred dialog from `md` up.
 * Locks page scroll and closes on backdrop tap or Escape.
 */
export function BottomSheet({ open, onClose, title, description, children, footer, className }: Props) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    panel.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6">
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 animate-fadeIn bg-ink/40"
        onClick={onClose}
        tabIndex={-1}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[92dvh] w-full animate-slideUp flex-col rounded-t-xl bg-paper shadow-sheet outline-none',
          'md:max-w-[480px] md:animate-toastIn md:rounded-xl',
          className,
        )}
      >
        <div className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-line-strong md:hidden" aria-hidden />
        <header className="flex shrink-0 items-start justify-between gap-4 px-gutter pb-2 pt-3 md:pt-5">
          <div className="pt-2">
            <h2 className="text-title3 font-semibold">{title}</h2>
            {description && <p className="mt-1 text-callout text-stone">{description}</p>}
          </div>
          <IconButton icon={X} label="Cerrar" onClick={onClose} variant="surface" className="-mr-1" iconSize={18} />
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-gutter pb-4">{children}</div>
        {footer && (
          <footer className="shrink-0 border-t border-line bg-paper px-gutter pt-3 pb-[calc(12px+var(--safe-bottom))] md:rounded-b-xl md:pb-5">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
