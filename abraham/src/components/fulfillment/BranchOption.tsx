import { Store } from 'lucide-react';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import type { Branch, FulfillmentMode } from '@/types';

interface Props {
  branch: Branch;
  selected: boolean;
  mode: FulfillmentMode;
  onSelect: () => void;
}

export function BranchOption({ branch, selected, mode, onSelect }: Props) {
  const disabled = !branch.active;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-disabled={disabled}
      onClick={() => !disabled && onSelect()}
      className={cn(
        'flex w-full items-start gap-3.5 rounded-lg bg-white p-4 text-left transition-shadow',
        selected ? 'shadow-[0_0_0_1.5px_#C8102E]' : 'shadow-hairline',
        disabled ? 'cursor-not-allowed' : 'hover:shadow-[0_0_0_1px_#D9D6D2]',
        selected && 'hover:shadow-[0_0_0_1.5px_#C8102E]',
      )}
    >
      <span
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
          disabled ? 'bg-mist text-stone' : selected ? 'bg-red text-white' : 'bg-ink text-white',
        )}
      >
        <Icon icon={Store} size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className={cn('text-body font-medium', disabled ? 'text-stone' : 'text-ink')}>{branch.shortName}</span>
          {disabled ? <Badge>Próximamente</Badge> : <Badge tone="success">Recibiendo pedidos</Badge>}
        </span>
        <span className="mt-0.5 block text-footnote text-stone">
          {branch.address}, {branch.city}
        </span>
        {!disabled && mode === 'delivery' && (
          <span className="mt-2 block text-footnote text-ink-muted">
            Envío <span className="tabular">{formatPrice(branch.delivery.fee)}</span> · {branch.delivery.coverage.slice(0, 3).join(', ')}
            {branch.delivery.coverage.length > 3 && ` y ${branch.delivery.coverage.length - 3} más`}
          </span>
        )}
        {!disabled && mode === 'pickup' && (
          <span className="mt-2 block text-footnote text-ink-muted">Retirás en el local</span>
        )}
      </span>
    </button>
  );
}
