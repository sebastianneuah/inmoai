import { ChevronDown, MapPin, Store } from 'lucide-react';
import { branchById } from '@/data/branches';
import { formatAddress } from '@/lib/coverage';
import { cn } from '@/lib/cn';
import { useSession } from '@/store/session';
import { useUi } from '@/store/ui';
import { Icon } from '@/components/ui/Icon';
import { Segmented } from '@/components/ui/Segmented';
import { modeOptions } from './LocationSheet';

export function useLocationLabel() {
  const { mode, branchId, addresses, addressId } = useSession();
  const branch = branchById(branchId);
  const address = addresses.find((a) => a.id === addressId);
  if (mode === 'pickup') {
    return {
      eyebrow: 'Retirás en',
      label: branch ? branch.shortName : 'Elegí una sucursal',
      missing: !branch,
    };
  }
  return {
    eyebrow: branch ? `Delivery desde ${branch.shortName}` : 'Delivery',
    label: address ? formatAddress(address) : 'Agregá tu dirección',
    missing: !address || !branch,
  };
}

/** Home header control: mode switch + destination. */
export function LocationBar({ className }: { className?: string }) {
  const mode = useSession((s) => s.mode);
  const setMode = useSession((s) => s.setMode);
  const open = useUi((s) => s.openLocationSheet);
  const { eyebrow, label, missing } = useLocationLabel();

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <Segmented label="Modo de entrega" value={mode} onChange={setMode} options={modeOptions} />
      <button
        type="button"
        onClick={() => open(true)}
        className="press flex min-h-14 w-full items-center gap-3 rounded-lg bg-white px-4 py-2.5 text-left shadow-hairline transition-colors hover:bg-paper"
      >
        <Icon icon={mode === 'pickup' ? Store : MapPin} size={20} className={missing ? 'text-red' : 'text-ink'} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-caption text-stone">{eyebrow}</span>
          <span className={cn('block truncate text-body font-medium', missing ? 'text-red' : 'text-ink')}>{label}</span>
        </span>
        <Icon icon={ChevronDown} size={18} className="text-stone" />
      </button>
    </div>
  );
}

/** Compact pill used in the desktop header. */
export function LocationPill() {
  const open = useUi((s) => s.openLocationSheet);
  const mode = useSession((s) => s.mode);
  const { eyebrow, label, missing } = useLocationLabel();
  return (
    <button
      type="button"
      onClick={() => open(true)}
      className="flex h-11 max-w-[280px] items-center gap-2.5 rounded-full bg-white pl-3.5 pr-3 text-left shadow-hairline hover:bg-mist"
    >
      <Icon icon={mode === 'pickup' ? Store : MapPin} size={18} className={missing ? 'text-red' : 'text-ink'} />
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-[11px] text-stone">{eyebrow}</span>
        <span className={cn('block truncate text-footnote font-medium', missing && 'text-red')}>{label}</span>
      </span>
      <Icon icon={ChevronDown} size={16} className="text-stone" />
    </button>
  );
}
