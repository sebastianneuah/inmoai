import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { useUi } from '@/store/ui';
import { Icon } from './Icon';

export function ToastHost() {
  const toast = useUi((s) => s.toast);
  const dismiss = useUi((s) => s.dismissToast);
  if (!toast) return null;
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-[calc(12px+var(--safe-top))] z-[60] flex justify-center px-4 lg:top-auto lg:bottom-8"
      role="status"
      aria-live="polite"
    >
      <div
        key={toast.id}
        className="pointer-events-auto flex w-full max-w-[400px] animate-toastIn items-center gap-3 rounded-full bg-ink py-2 pl-4 pr-2 text-white shadow-float"
      >
        <Icon icon={CheckCircle2} size={18} className="text-white/80" />
        <span className="min-w-0 flex-1 truncate text-callout">{toast.message}</span>
        {toast.action ? (
          <Link
            to={toast.action.to}
            onClick={dismiss}
            className="flex h-9 items-center rounded-full bg-white/10 px-4 text-footnote font-medium hover:bg-white/20"
          >
            {toast.action.label}
          </Link>
        ) : (
          <span className="h-9" />
        )}
      </div>
    </div>
  );
}
