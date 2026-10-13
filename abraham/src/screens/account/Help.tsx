import { useState } from 'react';
import { ChevronDown, Store } from 'lucide-react';
import { branches } from '@/data/branches';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/ui/Icon';
import { PageHeader } from '@/components/layout/PageHeader';

const faqs = [
  {
    q: '¿Cómo sigo mi pedido?',
    a: 'Entrá a Pedidos. Tus pedidos en curso aparecen arriba con su estado actualizado.',
  },
  {
    q: '¿Puedo retirar en la sucursal?',
    a: 'Sí. Elegí “Retiro” al comienzo o en el resumen del pedido y seleccioná la sucursal.',
  },
  {
    q: '¿Cómo uso un cupón?',
    a: 'Desde Ofertas tocá “Aplicar”, o ingresá el código en tu pedido antes de continuar. Se aplica un cupón por pedido.',
  },
  {
    q: '¿A qué zonas llega el delivery?',
    a: 'Cada sucursal tiene su zona de entrega. Al elegir tu dirección te indicamos si está dentro de la cobertura de la sucursal seleccionada.',
  },
  {
    q: '¿Los productos son kosher?',
    a: 'ABRAHAM es una marca de sushi kosher. La información de certificación se publicará en esta sección.',
  },
];

export default function Help() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <>
      <PageHeader title="Ayuda" fallback="/cuenta" />
      <div className="mx-auto max-w-[640px] px-gutter pt-2 lg:px-8">
        <h2 className="eyebrow mb-2 px-1 text-stone">Preguntas frecuentes</h2>
        <ul className="divide-y divide-line overflow-hidden rounded-lg bg-white shadow-hairline">
          {faqs.map((f, i) => (
            <li key={f.q}>
              <button
                type="button"
                aria-expanded={open === i}
                onClick={() => setOpen(open === i ? null : i)}
                className="flex min-h-14 w-full items-center justify-between gap-4 px-4 py-3 text-left"
              >
                <span className="text-body">{f.q}</span>
                <Icon icon={ChevronDown} size={18} className={cn('text-stone transition-transform', open === i && 'rotate-180')} />
              </button>
              {open === i && <p className="-mt-1 px-4 pb-4 text-callout text-ink-muted">{f.a}</p>}
            </li>
          ))}
        </ul>

        <h2 className="eyebrow mb-2 mt-8 px-1 text-stone">Sucursales</h2>
        <ul className="divide-y divide-line overflow-hidden rounded-lg bg-white shadow-hairline">
          {branches.map((b) => (
            <li key={b.id} className="flex items-center gap-3.5 px-4 py-4">
              <Icon icon={Store} />
              <div>
                <p className="text-body">{b.name}</p>
                <p className="text-footnote text-stone">
                  {b.address}, {b.city}
                  {!b.active && ' · Próximamente'}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 px-1 text-footnote text-stone">Los canales de contacto se publicarán con el lanzamiento.</p>
      </div>
    </>
  );
}
