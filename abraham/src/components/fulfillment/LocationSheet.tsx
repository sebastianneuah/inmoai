import { useState } from 'react';
import { Bike, MapPin, Plus, ShoppingBag } from 'lucide-react';
import { branchById, branches } from '@/data/branches';
import { formatAddress, isCovered } from '@/lib/coverage';
import { useSession } from '@/store/session';
import { useUi } from '@/store/ui';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { ChoiceRow } from '@/components/ui/Choice';
import { Icon } from '@/components/ui/Icon';
import { Notice } from '@/components/ui/Notice';
import { Segmented } from '@/components/ui/Segmented';
import { AddressForm } from './AddressForm';
import { BranchOption } from './BranchOption';

export const modeOptions = [
  { value: 'delivery' as const, label: 'Delivery', icon: Bike },
  { value: 'pickup' as const, label: 'Retiro', icon: ShoppingBag },
];

/** Choose Delivery/Retiro, the kitchen and the delivery address. */
export function LocationSheet() {
  const open = useUi((s) => s.locationSheetOpen);
  const setOpen = useUi((s) => s.openLocationSheet);
  return (
    <BottomSheet
      open={open}
      onClose={() => setOpen(false)}
      title="¿Cómo querés tu pedido?"
      footer={
        <Button block onClick={() => setOpen(false)}>
          Listo
        </Button>
      }
    >
      <LocationPicker />
    </BottomSheet>
  );
}

export function LocationPicker({ compact }: { compact?: boolean }) {
  const { mode, setMode, branchId, setBranch, addresses, addressId, selectAddress, saveAddress } = useSession();
  const [adding, setAdding] = useState(false);
  const branch = branchById(branchId);

  return (
    <div className="flex flex-col gap-6 pt-2">
      <Segmented label="Modo de entrega" value={mode} onChange={setMode} options={modeOptions} />

      <section>
        <h3 className="eyebrow mb-3 text-stone">{mode === 'delivery' ? 'Cocina que prepara tu pedido' : 'Sucursal de retiro'}</h3>
        <div className="flex flex-col gap-2.5" role="radiogroup" aria-label="Sucursal">
          {branches.map((b) => (
            <BranchOption key={b.id} branch={b} mode={mode} selected={b.id === branchId} onSelect={() => setBranch(b.id)} />
          ))}
        </div>
      </section>

      {mode === 'delivery' && (
        <section>
          <h3 className="eyebrow mb-1 text-stone">Dirección de entrega</h3>
          {adding ? (
            <div className="pt-3">
              <AddressForm
                onSave={(a) => {
                  saveAddress(a);
                  setAdding(false);
                }}
                onCancel={() => setAdding(false)}
              />
            </div>
          ) : (
            <>
              {addresses.length > 0 && (
                <div className="divide-y divide-line" role="radiogroup" aria-label="Direcciones guardadas">
                  {addresses.map((a) => {
                    const covered = isCovered(a, branch);
                    return (
                      <ChoiceRow
                        key={a.id}
                        type="radio"
                        name="address"
                        checked={a.id === addressId}
                        onChange={() => selectAddress(a.id)}
                        title={
                          <span className="flex items-center gap-2">
                            {formatAddress(a)}
                          </span>
                        }
                        description={
                          covered ? (
                            `${a.label} · ${a.neighborhood}`
                          ) : (
                            <span className="text-red">
                              {a.neighborhood} · Fuera de la zona de {branch?.shortName ?? 'la sucursal'}
                            </span>
                          )
                        }
                      />
                    );
                  })}
                </div>
              )}
              {addresses.length === 0 && !compact && (
                <p className="flex items-center gap-2 py-3 text-callout text-stone">
                  <Icon icon={MapPin} size={16} />
                  Todavía no guardaste direcciones.
                </p>
              )}
              <Button variant="secondary" size="md" leading={<Icon icon={Plus} size={16} />} onClick={() => setAdding(true)} className="mt-2">
                Agregar dirección
              </Button>
              {branch && (
                <Notice className="mt-4">
                  {branch.shortName} entrega en {branch.delivery.coverage.join(', ')}. Zonas de demostración, sujetas a confirmación.
                </Notice>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
