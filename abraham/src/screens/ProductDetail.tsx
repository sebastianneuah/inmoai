import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Heart, PackageX } from 'lucide-react';
import { branchById } from '@/data/branches';
import { categoryById } from '@/data/categories';
import { modifiers as modifierCatalog } from '@/data/modifiers';
import { productById } from '@/data/products';
import { formatPrice } from '@/lib/format';
import { unitPrice } from '@/lib/pricing';
import { cn } from '@/lib/cn';
import { MAX_QTY, useCart } from '@/store/cart';
import { useSession } from '@/store/session';
import { useUi } from '@/store/ui';
import { ProductBadgeTag } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { ChoiceRow } from '@/components/ui/Choice';
import { EmptyState } from '@/components/ui/EmptyState';
import { TextArea } from '@/components/ui/Field';
import { IconButton } from '@/components/ui/IconButton';
import { Notice } from '@/components/ui/Notice';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { PageHeader } from '@/components/layout/PageHeader';
import { FoodImage } from '@/components/media/FoodImage';
import { ProductTile } from '@/components/product/ProductTile';
import type { ModifierId } from '@/types';

export default function ProductDetail() {
  const { id = '' } = useParams();
  const product = productById(id);
  // Reset local state when navigating between related products.
  return product ? <ProductView key={product.id} productId={product.id} /> : <NotFound />;
}

function NotFound() {
  return (
    <>
      <PageHeader title="Producto" fallback="/menu" />
      <EmptyState
        icon={PackageX}
        title="Producto no disponible"
        body="Puede que ya no esté en el menú. Volvé al menú para ver las opciones disponibles."
        action={<ButtonLink to="/menu" variant="dark" size="md">Ir al menú</ButtonLink>}
      />
    </>
  );
}

function ProductView({ productId }: { productId: string }) {
  const product = productById(productId)!;
  const navigate = useNavigate();
  const add = useCart((s) => s.add);
  const showToast = useUi((s) => s.showToast);
  const { favorites, toggleFavorite, branchId } = useSession();
  const branch = branchById(branchId);

  const [qty, setQty] = useState(1);
  const [selected, setSelected] = useState<ModifierId[]>([]);
  const [notes, setNotes] = useState('');

  const isFav = favorites.includes(product.id);
  const unavailable = !!branch && product.unavailableAt?.includes(branch.id);
  const price = unitPrice(product.id, selected);
  const total = price * qty;
  const category = categoryById[product.categoryId];
  const related = (product.related ?? []).map(productById).filter((p): p is NonNullable<typeof p> => !!p);

  const toggle = (m: ModifierId) =>
    setSelected((s) => (s.includes(m) ? s.filter((x) => x !== m) : [...s, m]));

  const submit = () => {
    add({ productId: product.id, quantity: qty, modifiers: selected, notes });
    showToast(`Agregaste ${qty > 1 ? `${qty} × ` : ''}${product.name}`, { label: 'Ver pedido', to: '/carrito' });
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate('/menu');
  };

  const favButton = (
    <IconButton
      icon={Heart}
      label={isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
      onClick={() => {
        toggleFavorite(product.id);
        showToast(isFav ? 'Quitado de favoritos' : 'Guardado en favoritos');
      }}
      className={cn(isFav && '[&_svg]:fill-red [&_svg]:text-red')}
    />
  );

  const addBar = (
    <div className="flex items-center gap-3">
      <QuantityStepper value={qty} onChange={setQty} max={MAX_QTY} />
      <Button block onClick={submit} disabled={unavailable} className="flex-1 justify-between px-5">
        <span className="flex w-full items-center justify-between gap-3">
          <span>Agregar</span>
          <span className="tabular">{formatPrice(total)}</span>
        </span>
      </Button>
    </div>
  );

  return (
    <div className="pb-[calc(96px+var(--safe-bottom))] lg:pb-20">
      {/* Phone: header floats over the photo */}
      <div className="fixed inset-x-0 top-0 z-30 lg:hidden">
        <PageHeader title={product.name} fallback="/menu" transparent trailing={favButton} />
      </div>
      <div className="hidden lg:block">
        <PageHeader title={category.name} fallback="/menu" trailing={favButton} />
      </div>

      <div className="mx-auto max-w-content lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-14 lg:px-8 lg:pt-4">
        <div className="lg:sticky lg:top-[96px] lg:self-start">
          <FoodImage
            src={product.image}
            alt={product.name}
            tone={product.tone}
            mark="lg"
            caption
            eager
            className="aspect-square max-h-[62vh] w-full lg:max-h-none lg:rounded-xl"
          />
        </div>

        <div className="px-gutter pt-6 lg:px-0 lg:pt-2">
          {product.badges && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {product.badges.map((b) => (
                <ProductBadgeTag key={b} badge={b} />
              ))}
            </div>
          )}
          <p className="eyebrow text-stone">{category.name} · {product.portion}</p>
          <h1 className="mt-2 text-title1 font-semibold lg:text-display">{product.name}</h1>
          <p className="mt-3 text-body text-ink-muted lg:text-headline lg:font-normal">{product.description}</p>
          <p className="tabular mt-4 text-title3 font-semibold">{formatPrice(product.price)}</p>

          {unavailable && (
            <Notice tone="warning" className="mt-5">
              No disponible en {branch?.shortName}. Elegí otra sucursal para pedirlo.
            </Notice>
          )}

          {product.modifiers.length > 0 && (
            <section className="mt-8 border-t border-line pt-6">
              <div className="flex items-baseline justify-between">
                <h2 className="text-headline font-semibold">Personalizá tu pedido</h2>
                <span className="text-footnote text-stone">Opcional</span>
              </div>
              <div className="mt-2 divide-y divide-line">
                {product.modifiers.map((id) => {
                  const m = modifierCatalog[id];
                  return (
                    <ChoiceRow
                      key={id}
                      type="checkbox"
                      checked={selected.includes(id)}
                      onChange={() => toggle(id)}
                      title={m.name}
                      trailing={m.price > 0 ? `+${formatPrice(m.price)}` : undefined}
                    />
                  );
                })}
              </div>
            </section>
          )}

          <section className="mt-8 border-t border-line pt-6">
            <TextArea
              label="Aclaraciones para la cocina"
              optional
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej.: salsa de soja aparte, sin sésamo"
              maxLength={140}
              hint={`${notes.length}/140`}
            />
          </section>

          <div className="mt-8 hidden lg:block">{addBar}</div>

          {related.length > 0 && (
            <section className="mt-12 border-t border-line pt-6">
              <h2 className="text-headline font-semibold">Para acompañar</h2>
              <div className="no-scrollbar -mx-gutter mt-4 flex gap-4 overflow-x-auto px-gutter lg:mx-0 lg:grid lg:grid-cols-3 lg:px-0">
                {related.map((p) => (
                  <ProductTile key={p.id} product={p} className="w-[148px] shrink-0 lg:w-auto" />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Phone: persistent add bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 px-gutter pt-3 pb-[calc(12px+var(--safe-bottom))] backdrop-blur-xl lg:hidden">
        {addBar}
      </div>
    </div>
  );
}
