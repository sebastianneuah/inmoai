import { branches } from '@/data/branches';
import { useSession } from '@/store/session';
import { useUi } from '@/store/ui';
import { Segmented } from '@/components/ui/Segmented';
import { PageHeader } from '@/components/layout/PageHeader';
import { BranchOption } from '@/components/fulfillment/BranchOption';
import { modeOptions } from '@/components/fulfillment/LocationSheet';

export default function Branches() {
  const { mode, setMode, branchId, setBranch } = useSession();
  const showToast = useUi((s) => s.showToast);
  return (
    <>
      <PageHeader title="Sucursales" fallback="/" desktopTitle={false} />
      <div className="mx-auto max-w-[640px] px-gutter pt-2 lg:px-8">
        <h1 className="hidden pb-6 text-display font-semibold lg:block">Sucursales</h1>
        <Segmented label="Modo de entrega" value={mode} onChange={setMode} options={modeOptions} />
        <div className="mt-5 flex flex-col gap-3" role="radiogroup" aria-label="Sucursal">
          {branches.map((b) => (
            <BranchOption
              key={b.id}
              branch={b}
              mode={mode}
              selected={b.id === branchId}
              onSelect={() => {
                setBranch(b.id);
                showToast(`Pedís en ${b.shortName}`);
              }}
            />
          ))}
        </div>
        <p className="mt-4 text-footnote text-stone">
          Cada pedido se prepara en la sucursal que elijas. Las zonas de entrega se informan al cargar tu dirección.
        </p>
      </div>
    </>
  );
}
