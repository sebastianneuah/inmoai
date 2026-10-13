import { Bike, Store } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useSession } from '@/store/session';
import { useUi } from '@/store/ui';
import { Icon } from '@/components/ui/Icon';
import { useLocationLabel } from './LocationBar';

export function FulfillmentCard({ className }: { className?: string }) {
  const mode = useSession((s) => s.mode);
  const open = useUi((s) => s.openLocationSheet);
  const { eyebrow, label, missing } = useLocationLabel();
  return (
    <button
      type="button"
      onClick={() => open(true)}
      className={cn(
        'flex min-h-16 w-full items-center gap-3.5 rounded-lg bg-white px-4 py-3 text-left shadow-hairline hover:bg-paper',
        className,
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-white">
        <Icon icon={mode === 'delivery' ? Bike : Store} size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-footnote text-stone">{eyebrow}</span>
        <span className={cn('block truncate text-body font-medium', missing && 'text-red')}>{label}</span>
      </span>
      <span className="text-footnote font-medium text-ink-muted">Cambiar</span>
    </button>
  );
}
