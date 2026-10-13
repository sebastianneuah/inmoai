import { useState } from 'react';
import { MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { branchById } from '@/data/branches';
import { formatAddress, isCovered } from '@/lib/coverage';
import { useSession } from '@/store/session';
import { Badge } from '@/components/ui/Badge';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { PageHeader } from '@/components/layout/PageHeader';
import { AddressForm } from '@/components/fulfillment/AddressForm';
import type { Address } from '@/types';

export default function Addresses() {
  const { addresses, saveAddress, removeAddress, branchId, addressId } = useSession();
  const branch = branchById(branchId);
  const [editing, setEditing] = useState<Address | 'new' | null>(null);

  return (
    <>
      <PageHeader title="Direcciones" fallback="/cuenta" />
      <div className="mx-auto max-w-[640px] px-gutter pt-2 lg:px-8">
        {addresses.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title="Sin direcciones guardadas"
            body="Guardá tu casa o tu oficina para pedir delivery más rápido."
            action={
              <Button variant="dark" size="md" leading={<Icon icon={Plus} size={16} />} onClick={() => setEditing('new')}>
                Agregar dirección
              </Button>
            }
          />
        ) : (
          <>
            <ul className="divide-y divide-line overflow-hidden rounded-lg bg-white shadow-hairline">
              {addresses.map((a) => (
                <li key={a.id} className="flex items-center gap-3 py-3 pl-4 pr-2">
                  <Icon icon={MapPin} className="text-ink" />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-body font-medium">
                      <span className="truncate">{formatAddress(a)}</span>
                      {a.id === addressId && <Badge tone="ink">Actual</Badge>}
                    </p>
                    <p className="truncate text-footnote text-stone">
                      {a.label} · {a.neighborhood}
                      {branch && !isCovered(a, branch) && <span className="text-red"> · Fuera de zona de {branch.shortName}</span>}
                    </p>
                  </div>
                  <IconButton icon={Pencil} label="Editar" iconSize={18} onClick={() => setEditing(a)} />
                  <IconButton icon={Trash2} label="Eliminar" iconSize={18} onClick={() => removeAddress(a.id)} />
                </li>
              ))}
            </ul>
            <Button variant="secondary" size="md" className="mt-4" leading={<Icon icon={Plus} size={16} />} onClick={() => setEditing('new')}>
              Agregar dirección
            </Button>
          </>
        )}
      </div>

      <BottomSheet open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'Nueva dirección' : 'Editar dirección'}>
        {editing !== null && (
          <div className="pt-2 pb-2">
            <AddressForm
              initial={editing === 'new' ? undefined : editing}
              onSave={(a) => {
                saveAddress(a);
                setEditing(null);
              }}
              onCancel={() => setEditing(null)}
            />
          </div>
        )}
      </BottomSheet>
    </>
  );
}
